# Summit Web Login Page

This is the web-based login interface for Summit that integrates with www.codingeverest.com.

## Features

- ✨ Modern, responsive design
- 🔐 Secure authentication with JWT tokens
- 📱 Mobile-friendly
- 🎨 Beautiful gradient design
- ⚡ Fast and lightweight (no dependencies)
- 🔄 Login and registration in one page

## Files

- `index.html` - Complete login/registration page
- `landing-page-snippet.html` - HTML snippets for your landing page
- `README.md` - This file

## Deployment

### On Your Web Server

1. Upload `index.html` to `/var/www/summit/web-login/`
2. Configure Nginx to serve it at `/summit/login`
3. Ensure your Summit backend is running on port 4000

### Nginx Configuration

```nginx
location /summit/login {
    alias /var/www/summit/web-login;
    index index.html;
    try_files $uri $uri/ /summit/login/index.html;
}
```

## API Configuration

The login page automatically detects the environment:

- **Development**: Uses `http://localhost:4000/api`
- **Production**: Uses `https://api.codingeverest.com/summit/api`

You can modify the API URL in the JavaScript section:

```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:4000/api' 
    : 'https://api.codingeverest.com/summit/api';
```

Or if using the path-based approach (recommended):

```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:4000/api' 
    : '/summit/api';  // Relative to your domain
```

## Integration with Landing Page

Add one of the button styles from `landing-page-snippet.html` to your landing page:

```html
<!-- Simple button -->
<a href="/summit/login" class="btn">Login to Summit</a>

<!-- Feature card -->
<!-- See landing-page-snippet.html for complete examples -->
```

## Testing Locally

1. Start the Summit backend:
   ```bash
   cd ../server
   npm run dev
   ```

2. Open `index.html` in a browser or use a local server:
   ```bash
   # Python
   python -m http.server 8080
   
   # Node.js
   npx serve .
   ```

3. Test login/registration

## Customization

### Colors

The default color scheme uses purple gradients. To change:

```css
/* Primary gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Update these values to match your brand colors */
```

### Logo

Replace the text logo with an image:

```html
<div class="logo">
    <img src="/path/to/logo.png" alt="Summit Logo" style="max-width: 200px;">
    <p>Secure Video Conferencing & Chat</p>
</div>
```

### Redirect URL

After successful login, users are redirected to `/summit/app`. Change this:

```javascript
// In the login form submit handler
setTimeout(() => {
    window.location.href = '/summit/app'; // Change this URL
}, 1500);
```

## Security Features

- ✅ JWT token storage in localStorage
- ✅ Password length validation (min 6 characters)
- ✅ HTTPS enforced in production
- ✅ Secure HTTP-only cookies recommended (server-side)
- ✅ CORS protection on API

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## API Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user (with token)

## Error Handling

The page handles common errors:

- Invalid credentials
- User already exists
- Network errors
- Server errors
- Validation errors

## Token Storage

After successful authentication, the page stores:

```javascript
localStorage.setItem('summit_token', token);
localStorage.setItem('summit_user', JSON.stringify(user));
```

Your Summit app should check for these values to maintain the session.

## Production Checklist

- [ ] Upload to `/var/www/summit/web-login/`
- [ ] Configure Nginx location block
- [ ] Update API_URL if needed
- [ ] Test registration
- [ ] Test login
- [ ] Test redirect after login
- [ ] Verify mobile responsiveness
- [ ] Check HTTPS works
- [ ] Test error handling

## Troubleshooting

**Login button does nothing?**
- Check browser console for errors
- Verify Summit backend is running
- Check API URL configuration

**502 Bad Gateway?**
- Backend not running on port 4000
- Check: `curl http://localhost:4000/health`

**CORS errors?**
- Backend needs to allow your domain
- Check CORS_ORIGIN in server/.env

**Page not found?**
- Check Nginx configuration
- Verify file path: `/var/www/summit/web-login/index.html`
- Run: `sudo nginx -t`

## Development

To modify the login page:

1. Edit `index.html`
2. Test locally
3. Deploy to server
4. Clear browser cache
5. Test in production

No build process needed - it's pure HTML/CSS/JavaScript!

---

For more information, see the main integration guide: `../SUMMIT_WEB_INTEGRATION.md`

