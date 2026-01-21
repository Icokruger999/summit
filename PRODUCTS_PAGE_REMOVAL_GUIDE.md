# Products Page Removal Guide

## Objective
Remove the separate Products page and make the Products dropdown link directly to the Summit landing page.

## Changes Needed on codingeverest.com

### 1. Update Navigation Menu

In your main website's header/navigation file (likely `header.html`, `nav.html`, or in your main HTML template):

**BEFORE:**
```html
<nav>
  <a href="/">Home</a>
  <a href="/solutions">Solutions</a>
  <a href="/products">Products</a>  <!-- Links to products.html -->
  <a href="/resources">Resources</a>
  <a href="/contact">Contact</a>
</nav>
```

**AFTER:**
```html
<nav>
  <a href="/">Home</a>
  <a href="/solutions">Solutions</a>
  <div class="dropdown">
    <button class="dropbtn">Products ▼</button>
    <div class="dropdown-content">
      <a href="/milo">Milo</a>
      <a href="/summit/login">Summit</a>
    </div>
  </div>
  <a href="/resources">Resources</a>
  <a href="/contact">Contact</a>
</nav>
```

**OR** if you want a simple link without dropdown:
```html
<nav>
  <a href="/">Home</a>
  <a href="/solutions">Solutions</a>
  <a href="/summit/login">Summit</a>  <!-- Direct link to Summit -->
  <a href="/resources">Resources</a>
  <a href="/contact">Contact</a>
</nav>
```

### 2. Add Dropdown CSS (if using dropdown)

Add this CSS to your stylesheet:

```css
/* Dropdown container */
.dropdown {
  position: relative;
  display: inline-block;
}

/* Dropdown button */
.dropdown .dropbtn {
  background: none;
  border: none;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  padding: 10px 15px;
}

/* Dropdown content (hidden by default) */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: white;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;
  border-radius: 8px;
  margin-top: 5px;
}

/* Links inside the dropdown */
.dropdown-content a {
  color: #333;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  transition: background-color 0.3s;
}

/* Change color on hover */
.dropdown-content a:hover {
  background-color: #f1f1f1;
}

/* Show the dropdown menu on hover */
.dropdown:hover .dropdown-content {
  display: block;
}

/* Change button color on hover */
.dropdown:hover .dropbtn {
  color: #667eea;
}
```

### 3. Delete Products Page

Delete or archive the file:
- `products.html` (or whatever the products page is named)

### 4. Update Any Internal Links

Search your website for any links to `/products` or `/products.html` and update them to:
- `/summit/login` (for Summit)
- `/milo` (for Milo)

Common places to check:
- Footer links
- Sitemap
- Homepage buttons
- Blog posts
- Documentation

### 5. Add 301 Redirect (Optional but Recommended)

If you're using Apache, add to `.htaccess`:
```apache
# Redirect old products page to Summit
Redirect 301 /products.html /summit/login
Redirect 301 /products /summit/login
```

If you're using Nginx, add to your config:
```nginx
# Redirect old products page to Summit
location = /products.html {
    return 301 /summit/login;
}
location = /products {
    return 301 /summit/login;
}
```

## Alternative: Simple Two-Product Navigation

If you want to keep it simple with just two products in the nav:

```html
<nav>
  <a href="/">Home</a>
  <a href="/solutions">Solutions</a>
  <a href="/milo">Milo</a>
  <a href="/summit/login">Summit</a>
  <a href="/resources">Resources</a>
  <a href="/contact">Contact</a>
</nav>
```

## Testing Checklist

After making changes:
- [ ] Products dropdown shows Milo and Summit
- [ ] Clicking Summit goes to `/summit/login`
- [ ] Clicking Milo goes to Milo page
- [ ] Old `/products` URL redirects properly
- [ ] No broken links on the site
- [ ] Mobile menu works correctly
- [ ] Dropdown works on hover/click

## Files to Modify

Based on typical website structures, you'll likely need to modify:

1. **Navigation/Header:**
   - `header.html`
   - `nav.html`
   - `index.html` (if nav is inline)
   - `_includes/header.html` (if using Jekyll/static site generator)

2. **Styles:**
   - `style.css`
   - `main.css`
   - `navigation.css`

3. **Delete:**
   - `products.html`

4. **Server Config:**
   - `.htaccess` (Apache)
   - `nginx.conf` (Nginx)

## Need Help?

If you need help finding these files or implementing the changes, let me know:
- What platform is codingeverest.com built on? (WordPress, static HTML, React, etc.)
- Do you have access to the server/hosting?
- Can you share the navigation code?
