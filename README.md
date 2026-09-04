# Kortex ai

Facebook Messenger AI Automation System PRD

Project Name: AI Business automation




AI Messenger Automation Dashboard




1. Project Overview




একটি Web-Based Admin Dashboard তৈরি করতে হবে যেটা Facebook Messenger AI Automation System হিসেবে কাজ করবে।




সিস্টেমের মাধ্যমে:




Facebook Page Messenger এ কেউ মেসেজ করলে AI Reply দিবে

Facebook থেকে Order Receive করা যাবে

Admin Dashboard থেকে সবকিছু Control করা যাবে

Google AI Studio API ব্যবহার করে AI Response Generate হবে

Facebook Graph API + Webhook Integration থাকবে

শুধুমাত্র Admin Login করতে পারবে

কোনো Public User Registration বা Login থাকবে না

2. Main Goal




এই সিস্টেমের মূল লক্ষ্য হচ্ছে:




Facebook Messenger Automation

AI Chat System

Order Collection System

Admin-Controlled Business Dashboard

Image Generation Support

API Key Management

Facebook Page Integration

3. Technology Stack

Frontend

Next.js

React

Tailwind CSS

Shadcn UI

Backend

Node.js

Express.js অথবা Next.js API Routes

Database

PostgreSQL অথবা MongoDB

Authentication

Admin Only Authentication

JWT Session Authentication

AI Integration

Google AI Studio API (Gemini API)

Facebook Integration

Facebook Graph API

Messenger Webhook

Facebook Login for Page Connection

4. Authentication System

Rules

কোনো Public Signup থাকবে না

শুধুমাত্র Super Admin Login করতে পারবে

Single Admin Access

Secure Session System

Admin Password Change Option

Login Page




Fields:




Email

Password




Features:




Remember Me

Logout

Secure Session

5. Homepage Design (Simple Landing Page)

Homepage Goal




Simple modern landing page হবে।




অনেক বেশি Content থাকবে না।




Homepage Sections

Hero Section

Animated Messenger Chat UI

Fake Live Conversation Animation

AI Typing Effect

CTA Button:

“Open Dashboard”

“Connect Facebook Page”

Hero Text Example

Title




Automate Your Facebook Messenger with AI




Subtitle




AI automatically replies to customers, takes orders, and manages conversations from one dashboard.




Features Section




3-4 Simple Cards:




Card 1




AI Auto Reply




Card 2




Facebook Order Collection




Card 3




Admin Dashboard Control




Card 4




Image Generation Support




Live Chat Preview Section




একটি Fake Messenger Chat Animation থাকবে:




Customer:

“এই UPS এর দাম কত?”




AI:

“এই UPS এর দাম 1790 টাকা। Delivery Free।”




Footer




Simple footer:




Copyright

Admin Access

Privacy Policy

6. Admin Dashboard

Sidebar Menu

1. Overview




Dashboard Summary




2. Orders




Facebook Orders Management




3. Messenger Chats




Live Customer Conversations




4. AI Settings




Gemini API Settings




5. Facebook Integration




Connect Facebook Page




6. Prompt Manager




AI Prompt Control




7. Image Generator




AI Image Prompt Form




8. Automation Rules




Custom Automation Setup




9. Analytics




Message Statistics




10. Settings




Admin Settings




7. Dashboard Overview Page

Widgets

Total Messages

Total Orders

Connected Facebook Pages

AI Replies Today

Pending Orders

Revenue Estimate

Charts

Daily Messages

Orders Graph

AI Usage Statistics

8. Orders Dashboard

Features

Order List Table




Fields:




Customer Name

Facebook Name

Phone Number

Product

Quantity

Price

Address

Order Status

Date

Order Status Types

Pending

Confirmed

Processing

Delivered

Cancelled

Order Features

Search Order

Filter Order

Export CSV

Manual Edit

Delete Order

9. Messenger Chat System

Features

Real-Time Chat UI




Messenger-style interface




Functions

View customer chats

AI auto reply

Manual reply

Mark Important

Search chats

Assign tags

AI Response System




When customer messages:




AI detects intent

Replies automatically

Collects order information

10. AI Prompt Management

Admin Can:

Change AI behavior

Add custom prompts

Add business information

Add pricing data

Add delivery information

Example Prompt




“You are a Facebook sales assistant. Always answer in Bangla. Try to collect customer order details politely.”




11. Google AI Studio Integration

Features

Gemini API Key Input

API Test Button

API Usage Tracking

Error Logs

Settings Fields

Gemini API Key

Model Selection

Temperature

Max Tokens

12. Facebook Integration System

Features

Connect Facebook Page




Using Facebook Login




Webhook Setup

Receive Messenger messages

Receive comments

Receive orders

Facebook Features

Auto Reply

Send Message

Read Conversations

Page Token Management

13. Image Generator Module

Features




Admin can generate:




Product Ads

Facebook Post Images

Marketing Prompts

Form Fields

Product Name

Prompt

Style

Background

Language

Generate Button

Output

Generated Image Preview

Download Button

14. Automation Rules

Example Rules

Rule 1




If customer says:

“price”




AI replies:

“এই প্রোডাক্টের দাম 1790 টাকা।”




Rule 2




If customer says:

“order”




AI asks:




Name

Address

Phone Number

15. Notifications System

Admin Notifications

New Order

Failed AI Response

Facebook Disconnect

New Customer Message

16. Analytics Dashboard

Reports

Total Messages

Best Selling Products

Conversion Rate

Daily Orders

AI Performance

17. Security System

Must Have

JWT Authentication

Rate Limiting

Secure API Storage

Admin Activity Logs

CSRF Protection

18. Database Structure

Collections/Tables

Admins

Orders

Customers

Messages

AI Settings

Facebook Pages

Automation Rules

Generated Images

19. UI Design Style

Design Direction

Modern SaaS Style

Dark/Light Mode

Minimal UI

Rounded Cards

Smooth Animation

Messenger Style Chat Design

20. Important Rules

System Restrictions

No Public Registration

Only Admin Access

Admin-Controlled System

Mobile Responsive

Fast Loading

Secure Facebook API Handling

21. Future Features (Optional)

WhatsApp Integration

Instagram DM Automation

Voice AI Reply

Multi Admin System

Multi Facebook Page Support

Subscription Billing

Final Developer Instruction




Build a production-ready AI Facebook Messenger Automation Dashboard with:




Facebook Messenger Integration

Google AI Studio AI Response

Order Management

Admin Dashboard

Real-time Chat System

Image Generation Module

Modern SaaS UI

Secure Admin Authentication




The system should be scalable, fast, mobile responsive, and easy to manage from a single admin panel.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kortexfinal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/42970bda-580c-4203-a9b3-17ff6b0c20be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
