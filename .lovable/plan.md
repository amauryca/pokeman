
# Pokémon Marketplace — Order Request Website

## Overview
A modern, clean Pokémon merchandise site where customers browse your inventory and submit order requests via a contact form. You manage everything through a password-protected admin panel. Order details get emailed to you automatically.

---

## 1. Intro / Loading Animation
- A Pokémon-themed splash animation (Pokéball spin or card flip effect) plays briefly when the site first loads
- Transitions smoothly into the homepage

## 2. Homepage
- **Hero Section**: Eye-catching banner with your tagline and a brief personal story (supporting college, saving for a car)
- **Featured Products**: Highlight a few top items with images, prices, and availability badges
- **"Contact Me for Availability" CTA**: Prominent button that scrolls to products or opens the order request form

## 3. Product Catalog
- Grid of product cards showing: auto-selected image (based on product name), product name, price, quantity available, and sold/out-of-stock badges
- **Search bar** to filter by name
- **Category filters**: Trading Cards, Booster Boxes, Elite Trainer Boxes
- **Status indicators**: "In Stock (X available)", "Low Stock", "Sold Out" — clearly shown on each card
- Clicking "Contact Me" on a product pre-fills that item in the order request form

## 4. Order Request Form
- Simple form with fields:
  - Full Name (required)
  - Email Address (required)
  - Phone Number (optional)
  - Product(s) interested in (multi-select from available inventory, pre-filled if coming from a product card)
  - Quantity per product
  - Additional notes / questions (text area)
- On submit: sends all details to your email (amaurycacevedo@gmail.com) via a Supabase Edge Function
- Shows a "Thank You" confirmation message with next steps info
- Order requests also saved in the database so you can view them in the admin panel

## 5. Admin Panel (Password-Protected)
- Simple login page (Supabase Auth with email/password — just for you)
- **Product Management**:
  - Add new products (name, price, quantity, category)
  - Edit existing products inline (update price, quantity, mark as sold)
  - Quick stock controls: +/- quantity buttons, "Mark as Sold" toggle
  - Delete products
  - Images auto-selected based on product name using the Pokémon TCG API or a curated image set
- **Order Requests Dashboard**:
  - View all incoming order requests with customer info, products requested, and dates
  - Mark requests as "Contacted" / "Completed" for your own tracking

## 6. Design & UX
- Modern, clean layout with white space, soft shadows, and Pokémon accent colors (red, blue, yellow touches)
- Fully responsive for mobile and desktop
- Smooth animations on cards and page transitions
- Clear typography and easy navigation

## 7. Backend (Supabase)
- **Products table**: name, price, quantity, category, status, image URL
- **Order requests table**: customer name, email, phone, products requested, quantities, notes, status, timestamp
- **Edge Function**: sends formatted email notification on new order request
- **Auth**: single admin account for inventory management
- **RLS policies**: products readable by everyone, editable only by admin; order requests insertable by anyone, readable only by admin
