# WordPress to Markdown Conversion

This script converts the latest 4 posts from `api.greiv.in/wp-json/wp/v2/posts` into static Markdown files for the Astro blog.

## Usage

Run the conversion script:

```bash
npm run generate-blog
```

## What it does

1. **Fetches latest 4 posts** from WordPress REST API
2. **Downloads featured images** to `public/blog-images/`
3. **Converts HTML to Markdown** with proper formatting
4. **Generates frontmatter** with title, description, pubDate, coverImage, and tags
5. **Creates .md files** in `src/content/blog/`

## Generated Files

- Posts are saved as `src/content/blog/{slug}.md`
- Images are saved as `public/blog-images/{slug}{ext}`
- All converted posts are tagged with `wordpress` and `imported`

## Integration

After running the script:

- The posts become part of the static Astro blog collection
- They appear on the home page alongside other blog posts
- No runtime WordPress API calls are needed
- Images are served locally from the Astro site

## Frontmatter Generated

```yaml
---
title: 'Post Title'
description: |
  Post excerpt limited to 200 chars
pubDate: 'MMM DD, YYYY'
coverImage: '/blog-images/image-name.jpg'
tags:
  - wordpress
  - imported
---
```

The converted posts are fully integrated into the static Astro site and will be built with the rest of your content.
