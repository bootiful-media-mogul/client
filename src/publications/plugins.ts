import { PanelSlotIcon } from '@/publications/input'
import ayrshareIcon from '@/assets/images/icons/ayrshare.svg'
import podbeanIcon from '@/assets/images/publications/podcasts/publish-to-podbean.png'
import mockIcon from '@/assets/images/publications/podcasts/mock.png'
import wordpressIcon from '@/assets/images/publications/blogs/wordpress-og.png'
import markdownIcon from '@/assets/images/publications/blogs/download-blog-post-as-markdown.png'
import audioFileIcon from '@/assets/images/icons/audio-file.svg'
import blogIcon from '@/assets/images/icons/rss.svg'

/**
 * every plugin's artwork, by plugin name, for the places that list publications without
 * having the plugins' panels on the page to register it: the home page's calendar shows
 * publications of every kind. the publish panels still bring their own. a plugin missing
 * from here still renders, just without its artwork.
 */
export const PLUGIN_ICONS = new Map<string, PanelSlotIcon>(
  Object.entries({
    mogulAyrshare: ayrshareIcon,
    podcastEpisodeAyrshare: ayrshareIcon,
    blogPostAyrshare: ayrshareIcon,
    podbean: podbeanIcon,
    mockPodcastEpisode: mockIcon,
    wordpress: wordpressIcon,
    blogPostMarkdownFile: markdownIcon,
    audioFile: audioFileIcon,
    podcastEpisodeToBlogPost: blogIcon
  }).map(([plugin, icon]) => [plugin, new PanelSlotIcon(icon, icon)])
)
