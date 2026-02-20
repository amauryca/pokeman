

## Add Contact Info to Footer

Update the footer in `src/pages/Index.tsx` to display your phone number and email below the copyright line.

### Changes

**File: `src/pages/Index.tsx`**
- Add phone number (941-320-9859) and email (amaurycacevedo@gmail.com) as clickable links in the footer section
- Phone uses `tel:` link, email uses `mailto:` link
- Styled consistently with the existing footer text

### Result
The footer will show:
- Copyright line (existing)
- Phone: 941-320-9859 | Email: amaurycacevedo@gmail.com (new, clickable)

