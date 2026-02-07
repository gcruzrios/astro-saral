#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'

async function fetchWordPressPosts(perPage = 4) {
	const apiUrl = `https://api.greiv.in/wp-json/wp/v2/posts?per_page=${perPage}&_embed`

	try {
		const response = await fetch(apiUrl)
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const posts = await response.json()
		return posts
	} catch (error) {
		console.error('Failed to fetch WordPress posts:', error)
		return []
	}
}

async function fetchWordPressMedia(mediaId) {
	try {
		const response = await fetch(
			`https://api.greiv.in/wp-json/wp/v2/media/${mediaId}`
		)
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const media = await response.json()
		return media
	} catch (error) {
		console.error(`Failed to fetch media ${mediaId}:`, error)
		return null
	}
}

async function downloadImage(imageUrl, filename) {
	try {
		const response = await fetch(imageUrl)
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`)
		}

		const buffer = await response.arrayBuffer()
		const filePath = path.join(process.cwd(), 'public', 'blog-images', filename)

		await fs.mkdir(path.dirname(filePath), { recursive: true })
		await fs.writeFile(filePath, Buffer.from(buffer))

		console.log(`Downloaded image: ${filename}`)
		return filePath
	} catch (error) {
		console.error(`Failed to download image ${filename}:`, error)
		return null
	}
}

function cleanHtml(html) {
	return html
		.replace(/<[^>]*>/g, '') // Remove HTML tags
		.replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
		.replace(/&amp;/g, '&') // Replace HTML entities
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#8217;/g, "'")
		.replace(/&#8230;/g, '...')
		.replace(/&#8211;/g, '–')
		.replace(/Read more.*$/g, '') // Remove "Read more" links
		.replace(/Continue reading.*$/g, '') // Remove "Continue reading" links
		.trim()
}

function convertHtmlToMarkdown(html) {
	// Basic HTML to Markdown conversion
	let markdown = html
		// Headers
		.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, content) => {
			const hashes = '#'.repeat(parseInt(level))
			return `\n${hashes} ${cleanHtml(content)}\n\n`
		})
		// Bold
		.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
		.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
		// Italic
		.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
		.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
		// Links
		.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
		// Code blocks
		.replace(
			/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis,
			'\n```\n$1\n```\n\n'
		)
		// Inline code
		.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
		// Lists (simplified)
		.replace(/<ul[^>]*>/gi, '\n')
		.replace(/<\/ul>/gi, '\n')
		.replace(/<ol[^>]*>/gi, '\n')
		.replace(/<\/ol>/gi, '\n')
		.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
		// Paragraphs
		.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
		// Line breaks
		.replace(/<br[^>]*>/gi, '\n')
		// Remove remaining HTML tags
		.replace(/<[^>]*>/g, '')
		// Clean up multiple newlines
		.replace(/\n{3,}/g, '\n\n')
		// Clean HTML entities
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#8217;/g, "'")
		.replace(/&#8230;/g, '...')
		.replace(/&#8211;/g, '–')
		.trim()

	return markdown
}

function generateFrontmatter(post, featuredImagePath) {
	const title = cleanHtml(post.title.rendered)
	const description = cleanHtml(post.excerpt.rendered)
		.replace(/\n+/g, ' ')
		.substring(0, 200)
	const date = new Date(post.date).toISOString().split('T')[0]
	const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})

	let frontmatter = `---
title: '${title.replace(/'/g, "''")}'
description: |
  ${description}
pubDate: '${formattedDate}'
`

	if (featuredImagePath) {
		frontmatter += `coverImage: '/blog-images/${featuredImagePath}'\n`
	}

	frontmatter += 'tags:\n  - wordpress\n  - imported\n---\n\n'

	return frontmatter
}

async function main() {
	console.log('Fetching WordPress posts...')
	const posts = await fetchWordPressPosts(4)

	if (posts.length === 0) {
		console.log('No posts found to convert.')
		return
	}

	console.log(`Found ${posts.length} posts to convert...`)

	for (const post of posts) {
		try {
			let featuredImagePath

			// Fetch and download featured image
			if (post.featured_media) {
				const media = await fetchWordPressMedia(post.featured_media)
				if (media) {
					const mediumImage =
						media.media_details.sizes.medium_large ||
						media.media_details.sizes.medium ||
						media.media_details.sizes.full
					const ext = path.extname(mediumImage.source_url) || '.jpg'
					const filename = `${post.slug}${ext}`

					await downloadImage(mediumImage.source_url, filename)
					featuredImagePath = filename
				}
			}

			// Convert content to Markdown
			const markdownContent = convertHtmlToMarkdown(post.content.rendered)
			const frontmatter = generateFrontmatter(post, featuredImagePath)

			// Create full markdown file
			const fullContent = frontmatter + markdownContent

			// Write to file
			const filePath = path.join(
				process.cwd(),
				'src',
				'content',
				'blog',
				`${post.slug}.md`
			)
			await fs.writeFile(filePath, fullContent, 'utf-8')

			console.log(`✅ Converted: ${post.slug}.md`)
		} catch (error) {
			console.error(`❌ Failed to convert post ${post.slug}:`, error)
		}
	}

	console.log('\n🎉 Conversion complete!')
	console.log(
		'The WordPress posts have been converted to static Markdown files in src/content/blog/'
	)
	console.log('Featured images have been downloaded to public/blog-images/')
}

// Run the script
main().catch(console.error)
