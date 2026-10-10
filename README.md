# FUTA Live — starter project

A beginner-friendly prototype for a FUTA student community with a campus feed and student marketplace.

## What works in this prototype
- Switch between Campus Feed and Marketplace
- Search posts and product examples
- Filter posts and marketplace items by category
- Add a post to the in-memory feed
- Like/unlike a post
- Save/unsave a marketplace item
- Open WhatsApp with a prefilled seller enquiry
- Responsive design for laptop and mobile

## Important limitations
- Posts and likes are only stored in browser memory. Refreshing the page resets them.
- Product listings are sample data, not real sellers or verified products.
- Sign-in, comments, real listing creation, database storage, moderation tools, and deployment are not implemented yet.
- The WhatsApp enquiry opens a generic share link; no real seller number is configured.
- FUTA Live is an independent project concept and is not an official FUTA service.

## Requirements
- Node.js 20.9 or newer (LTS recommended)
- Internet access for the first dependency installation

## Run on Windows using VS Code
1. Extract the ZIP file.
2. Open VS Code.
3. Choose **File → Open Folder** and select the extracted `futa-live` folder.
4. Choose **Terminal → New Terminal**.
5. Run:

   ```bash
   npm install
   ```

6. When it finishes, run:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000` in your browser.
8. Keep the terminal open while using the site. Press `Ctrl + C` in the terminal to stop it.

## Next build steps
1. Add a proper comments interface.
2. Add Supabase authentication and database storage.
3. Add real marketplace listings with image uploads and seller contact details.
4. Add reporting/moderation and security checks before public launch.
5. Deploy to a free-tier host, subject to current plan limits.
