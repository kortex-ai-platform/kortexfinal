DO $$
DECLARE
  grp RECORD;
  keep_id UUID;
BEGIN
  FOR grp IN
    SELECT page_id, source, fb_user_id, post_id, array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM public.fb_conversations
    GROUP BY page_id, source, fb_user_id, post_id
    HAVING count(*) > 1
  LOOP
    keep_id := grp.ids[1];

    UPDATE public.fb_messages
    SET conversation_id = keep_id
    WHERE conversation_id = ANY (grp.ids[2:array_length(grp.ids, 1)]);

    UPDATE public.fb_conversations AS keep
    SET
      user_name = COALESCE(keep.user_name, src.user_name),
      user_avatar_url = COALESCE(keep.user_avatar_url, src.user_avatar_url),
      last_message_at = src.last_message_at,
      last_message_preview = src.last_message_preview,
      unread_count = src.unread_count,
      ai_enabled = COALESCE(keep.ai_enabled, src.ai_enabled),
      updated_at = now()
    FROM (
      SELECT
        max(last_message_at) AS last_message_at,
        (array_agg(last_message_preview ORDER BY last_message_at DESC NULLS LAST))[1] AS last_message_preview,
        sum(unread_count)::int AS unread_count,
        (array_agg(user_name ORDER BY (user_name IS NOT NULL) DESC, updated_at DESC))[1] AS user_name,
        (array_agg(user_avatar_url ORDER BY (user_avatar_url IS NOT NULL) DESC, updated_at DESC))[1] AS user_avatar_url,
        bool_or(ai_enabled) AS ai_enabled
      FROM public.fb_conversations
      WHERE id = ANY (grp.ids)
    ) AS src
    WHERE keep.id = keep_id;

    DELETE FROM public.fb_conversations
    WHERE id = ANY (grp.ids[2:array_length(grp.ids, 1)]);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS fb_conversations_messenger_unique_thread
ON public.fb_conversations (page_id, source, fb_user_id)
WHERE source = 'messenger' AND post_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fb_conversations_comment_unique_thread
ON public.fb_conversations (page_id, source, fb_user_id, post_id)
WHERE source = 'comment' AND post_id IS NOT NULL;