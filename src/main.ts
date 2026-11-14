// the broadcast theme's type, self-hosted so the studio never waits on a font cdn
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/400-italic.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './assets/base.css'
import { startTheme } from './theme'

import { createApp, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import App from './App.vue'
import { AYRSHARE_PLATFORM_LIMITS } from './publications/ayrshare'
import router from './index'
import { Calendar, DatePicker, setupCalendar } from 'v-calendar'
// import { setupCalendar } from 'v-calendar'

import 'v-calendar/style.css'

function formatNumberEnglish(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

// every Ayrshare plugin publishes to the same platforms, so they all share these labels.
// `shortLabel` names the platform's tab in the composer, where the full label won't fit.
const ayrshareLabels: Record<string, { label: string; shortLabel: string }> = {
  gmb: { label: 'Google Business Profile', shortLabel: 'Google Business' },
  facebook: { label: 'Facebook', shortLabel: 'Facebook' },
  linkedin: { label: 'LinkedIn', shortLabel: 'LinkedIn' },
  instagram: { label: 'Instagram', shortLabel: 'Instagram' },
  telegram: { label: 'Telegram', shortLabel: 'Telegram' },
  snapchat: { label: 'Snapchat', shortLabel: 'Snapchat' },
  pinterest: { label: 'Pinterest', shortLabel: 'Pinterest' },
  threads: { label: 'Threads', shortLabel: 'Threads' },
  youtube: { label: 'YouTube', shortLabel: 'YouTube' },
  reddit: { label: 'Reddit', shortLabel: 'Reddit' },
  bluesky: { label: 'Bluesky', shortLabel: 'Bluesky' },
  tiktok: { label: 'TikTok', shortLabel: 'TikTok' },
  twitter: { label: 'X (formerly known as Twitter)', shortLabel: 'X' }
}

const ayrsharePlatforms = Object.fromEntries(
  Object.entries(ayrshareLabels).map(([code, labels]) => [
    code,
    { ...labels, maxCharactersAllowed: formatNumberEnglish(AYRSHARE_PLATFORM_LIMITS[code]) }
  ])
)

// the composer every Ayrshare plugin's panel shares: one text for every selected platform,
// with a tab per platform for giving it text of its own
const ayrshareComposer = {
  list: 'Where the post goes',
  platforms: 'Post to',
  choose: 'Choose platforms',
  change: 'Change platforms',
  shared: 'Everywhere',
  sharedStatus: 'Text for the {n} selected platform | Text for all {n} selected platforms',
  sharedLabel: 'Text for every selected platform',
  platformLabel: 'Text for {platform}',
  usedBy: 'Goes to {platforms}.',
  usedByNone: 'Every selected platform has text of its own.',
  pickPlatforms: 'Choose the platforms to post to.',
  media: "Images go on each platform's own row, since each platform gets its own media.",
  inherited: 'Using the text from {shared}. Edit it here to give {platform} its own.',
  customized: '{platform} has its own text.',
  useShared: 'Use the text from {shared}',
  limit: '{num} characters or less.',
  limitShort: '{num} max',
  over: '{num} characters over the limit for {platform}.',
  overShort: 'over the limit',
  rowShared: 'Text from {shared}',
  rowOwn: 'Own text',
  rowOver: '{num} over the limit',
  rowEmpty: 'Empty',
  attachments: '{n} attachment | {n} attachments'
}

// i18n
const translations = {
  en: {
    labels: {
      'required-value': 'This is a required value!',
      ok: 'OK',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      'optional-value': '(this is optional)'
    },

    account: {
      // the account menu's button, which only shows initials
      label: 'Account: {name}'
    },
    brand: { name: 'mogul', product: 'studio' },
    notes: {
      buttons: {
        save: 'Save'
      },
      'system-wide': { title: 'System Notes' },
      entity: { title: 'Notes for {entityName}' },
      done: 'Done',
      filters: { 'show-done': 'Show Finished notes' },
      new: { prompt: "{entityName}'s Notes" }
    },
    blogs: {
      done: 'Done',
      editing: 'Editing {title}',

      save: 'Save',
      'new-blog': {
        title: 'Title',
        description: 'Description',
        'rss-url': 'RSS URL'
      }
    },
    publications: {
      dates: {
        created: 'Created',
        scheduled: 'Scheduled',
        published: 'Published',
        // a publication nobody picked a time for: it went as soon as the queue got to it
        now: 'Now'
      },
      schedule: {
        schedule: 'Schedule',
        when: 'Publish at',
        confirm: 'Schedule',
        cancel: 'Cancel',
        // the main button, when the home page's calendar has already said when
        for: 'Schedule for {when}'
      },
      outcomes: {
        'error-message': 'see error message',
        'no-error-message': '(no error message given)',
        keys: {
          mock: 'Mock',
          wordpress: 'Wordpress',
          podcastEpisodeToBlogPost: 'Blog Post',
          blogPostMarkdownFile: 'Blog Post Markdown File',
          blogPostAyrshare: 'Ayrshare (Blog Posts)',
          podcastEpisodeAyrshare: 'Ayrshare (Podcast Episodes)',
          mogulAyrshare: 'Ayrshare (Mogul)',
          mockPodcastEpisode: 'Mock',
          podbean: 'Podbean',
          gmb: 'Google Business Profile',
          audioFile: 'Audio File Download',
          facebook: 'Facebook',
          linkedin: 'LinkedIn',
          instagram: 'Instagram',
          telegram: 'Telegram',
          snapchat: 'Snapchat',
          pinterest: 'Pinterest',
          threads: 'Threads',
          youtube: 'YouTube',
          reddit: 'Reddit',
          bluesky: 'Bluesky',
          tiktok: 'TikTok',
          twitter: 'X (formerly known as Twitter)'
        }
      },
      plugins: {
        wordpress: {
          connected: 'Connected',
          connect: 'Connect to WordPress',
          disabled: 'You must first configure your WordPress instance in the Settings page.',
          title: 'Wordpress',
          tokenUri: 'WordPress API Token URI',
          authorizationUri: 'WordPress API Autorization URI',
          clientId: 'OAuth Client ID',
          siteId: 'WordPress Site ID',
          baseUrl: 'WordPress Site Base URL',
          clientSecret: 'OAuth Client Secret',
          publish: 'Publish',
          description: `Publish this post to your WordPress blog.`
        },
        blogPostMarkdownFile: {
          title: 'Publish a blog as a Markdown file',
          description: 'download a Markdown file for your post',
          download: 'Download',
          producing: 'Preparing the file…',
          ready: 'Your download is ready'
        },
        blogPostAyrshare: {
          title: 'Ayrshare (Blog Posts)',
          description:
            'Publish this post to your Ayrshare account for distribution to social media.',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          composer: ayrshareComposer
        },
        podcastEpisodeAyrshare: {
          description:
            'Publish this post to your Ayrshare account for distribution to social media.',
          title: 'Ayrshare (Podcast Episodes)',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          composer: ayrshareComposer
        },
        mogulAyrshare: {
          description:
            'Publish straight to your Ayrshare account for distribution to social media.',
          title: 'Ayrshare',
          twitterOauth1ApiKey: 'Twitter OAuth 1 API Key',
          twitterOauth1ApiSecret: 'Twitter OAuth 1 API Secret',
          ayrshareKey: 'Ayrshare API Key',
          charactersOrLess: '{num} characters or less',
          platforms: ayrsharePlatforms,
          composer: ayrshareComposer
        },
        blogPost: {
          description: 'Publish the episode as a blog post'
        },
        publish: 'Publish',
        github: {
          title: 'GitHub',
          clientId: 'Client ID',
          clientSecret: 'Client Secret'
        },
        mockPodcastEpisode: {
          description: 'Kicks off the production process, and generates dummy data',
          title: 'Mock Podcast Episode'
        },
        podcastEpisodeToBlogPost: {
          blogId: 'Blog ID',
          create: 'Create Post',
          creating: 'Creating the post…',
          description: 'Publish as a Blog Post',
          title: 'Publish as a Blog Post'
        },
        audioFile: {
          title: 'Download Audio File',
          description: 'Download the finalized (produced) .mp3 file for the episode',
          download: 'Download',
          producing: 'Producing the episode…',
          ready: 'Your download is ready'
        },
        transcript: {
          title: 'Transcript',
          download: 'Download transcript'
        },
        podbean: {
          title: 'Podbean',
          clientId: 'Client ID',
          clientSecret: 'Client Secret',
          description:
            'Publish this episode to your Podbean.com account for syndication and ad integration.'
        }
      }
    },

    writingassistant: {
      buttons: {
        proofread: 'Proofread',
        rewrite: 'Rewrite',
        'generate-with-ai': 'Generate with AI',
        generate: 'Generate',
        generating: 'Generating',
        friendly: 'Friendly',
        concise: 'Concise',
        professional: 'Professional'
      },
      placeholder: 'Ask the AI to write or rewrite this text…',
      alt: {
        friendly: 'Friendly',
        concise: 'Concise',
        professional: 'Professional'
      }
    },
    search: {
      navigation: {
        episode: 'visit podcast episode'
      },
      'no-results': {
        prompt: 'There are no results.'
      },
      results: {
        title: 'Search Results',
        result: {
          view: 'view'
        },
        prompt: '{count} result(s) for your search "{term}"'
      },
      // the button in the top bar that opens the palette, and the palette itself
      open: 'Search',
      shortcut: 'Shortcut: {keys}',
      palette: {
        label: 'Search',
        placeholder: 'Search episodes, posts, notes, or jump to…',
        everything: 'Search everything for “{term}”',
        'go-to': 'Go to',
        results: 'Results',
        searching: 'Searching…',
        nothing: 'Nothing found for “{term}”',
        move: 'move',
        choose: 'open',
        close: 'close',
        types: {
          episode: 'Episode',
          segment: 'Segment',
          post: 'Post',
          note: 'Note',
          mogul: 'Mogul'
        }
      }
    },

    // notifications
    notifications: {
      'job-started-event': 'the job {key} has started',
      'job-stopped-event': 'the job {key} has finished',
      'blog-updated-event': `The blog "{context}" with ID #{key} has been updated`.trim(),
      'blog-created-event': `The blog "{context}" with ID #{key} has been created`.trim(),
      'ayrshare-publication-completion-event':
        'Publication to the Ayrshare social media platform has completed.',
      'setting-written-event': 'Plugin configuration has been updated.',
      'transcript-processed-event': 'Transcript for #{key} has been processed.',
      'transcript-completed-event': 'Transcript for #{key} has been completed.',
      'podcast-episode-render-finished-event':
        'Finished producing an episode of the podcast episode #{key} ',
      'podcast-episode-render-started-event': 'Producing an episode of the podcast episode #{key}',
      'publication-started-event': 'Publishing podcast episode with ID #{key} has started.',
      'publication-completed-event': 'Publishing podcast episode with ID #{key} has finished.',
      'podcast-episode-completed-event':
        'The podcast with ID #{key} is completed and ready for production',
      'podcast-created-event': `The podcast "{context}", with ID #{key}, has been created.`.trim(),
      'podcast-updated-event': `The podcast "{context}", with ID #{key}, has been updated.`.trim(),
      'podcast-deleted-event': `The podcast "{context}", with ID #{key}, has been deleted.`.trim(),
      'transcription-failed-event': 'Transcribing #{key} failed.',
      'podcast-episode-segment-cleaning-started-event':
        "Cleaning the audio for segment #{key}. It takes a few minutes; you'll hear when it's ready.",
      'podcast-episode-segment-cleaned-event':
        'The audio for segment #{key} is clean and ready to edit.',
      'podcast-episode-segment-cleaning-failed-event':
        "The audio for segment #{key} couldn't be cleaned ({reason}), so it will use the original audio.",
      'podcast-episode-publication-waiting-for-cleaning-event':
        'Episode #{key} will be published as soon as its audio has finished cleaning.'
    },

    // managed files
    'managedfiles.please-upload-a-file': '(please upload a file.)',
    'managedfiles.visible':
      'Is this file publicly visible and accessible? If so, its public URL will show up in the preview panel.',
    'managedfiles.delete': 'Delete this file',
    'managedfiles.preview': 'Preview this file',
    'managedfiles.upload': 'Upload a file',
    'managedfiles.uploaded': 'Has this file been uploaded?',
    'managedfiles.content-type': "This file's content type",
    'managedfiles.file-name': "This file's name",

    // markdown
    'markdown.add-link-prompt': 'Where do you want the link to go to?',
    'markdown.add-image-prompt': 'Provide a caption for the image',

    // selections
    'selections.podcasts': 'Select a Podcast',
    'selections.blogs': 'Select a Blog',
    'selections.params.podcastIndexerJob.podcastId': 'Podcast ID',
    'selections.params.helloWorldJob.name': 'Name',
    'selections.params.importMarkdownPostsJob.blogId': 'Blog ID',
    'selections.params.importMarkdownPostsJob.managedFileId': 'Archive File',

    // jobs
    'jobs.name.testHelloWorldJob': '"Hello World!"',
    'jobs.name.helloWorldJob': '"Hello World!"',
    'jobs.name.failingJob': 'Fail',
    'jobs.name.notesIndexerJob': 'Notes Indexer',
    'jobs.name.podcastIndexerJob': 'Podcast Indexer',
    'jobs.required': '(required)',
    'jobs.name.importMarkdownPostsJob': 'Import Markdown Posts',
    'jobs.required-context-attributes': 'Required Context Attributes: {attributes}',
    'jobs.launch': 'Launch {name}',
    'jobs.title': 'Jobs',
    'jobs.attributes': 'Attributes',
    'jobs.busy': 'running {name}',
    'jobs.done': '{name} has completed successfully.',
    'jobs.failed': '{name} failed.',

    // app
    'app.tabs.main': 'Main',
    'app.title': 'Mogul Studio',
    'app.skip-to-content': 'Skip to content',
    'app.menu.label': 'Main menu',
    'app.panels.label': 'Panels',
    'app.tabs.label': 'Sections',
    'app.pages.episodes': 'Episodes',
    'app.pages.episode': 'Episode',
    'app.pages.posts': 'Posts',
    'app.pages.post': 'Post',
    'app.menu.home': 'Home',
    'app.menu.search': 'Search',
    'app.menu.settings': 'Settings',
    'app.menu.jobs': 'Jobs',
    'app.menu.test': 'Test',
    'app.menu.podcasts': 'Podcasts',
    'app.menu.blogs': 'Blogs',
    'app.menu.about': 'About',
    'app.made-with-love': ` Mogul, made with love ❤️ by {josh} (and with Spring 🍃) `,
    'app.panels.notes': 'Notes',
    'app.panels.transcripts': 'Transcripts',
    'app.panels.media-preview': 'Media Preview',
    'confirm.deletion': `Are you sure you want to delete "{title}"? 
    
This is NOT reversible! `,
    ok: 'OK',
    transcripts: {
      text: 'Transcript for {title}',
      buttons: {
        accept: 'Accept',
        revert: 'Revert',
        refresh: 'Re-transcribe',
        cancel: 'Cancel',
        save: 'Save'
      }
    },
    buttons: {
      accept: 'Accept',
      revert: 'Revert',
      cancel: 'Cancel'
    },
    'about.title': 'About',
    // input wrappers
    'components.input.enter-a-value': 'Enter a value',
    'components.inputWrapper.character-count': '{count} char(s)',
    'components.inputWrapper.empty': '(empty)',
    'components.inputWrapper.previous-tool': 'Previous tool',
    'components.inputWrapper.next-tool': 'Next tool',
    'compositions.attachments.insert': 'Insert attachment {id} into the text',
    // compositions
    'compositions.buttons.add-attachment': 'Add Attachment',
    // blogs
    'blogs.title': 'Blogs',
    'blogs.all': "{user}'s blogs",
    'panel.alt.open': 'Open {panel}',
    'panel.alt.minimize': 'Minimize {panel}',

    'popup.default-content': 'default panel content',
    'popup.close': 'Close',

    'managedfiles.alt.preview': 'A preview for managed file {id}',

    'diagnostics.server-time.server': 'server',
    'diagnostics.server-time.database': 'db',
    'diagnostics.server-time.browser': 'browser',

    'home.title': 'Home',
    'home.publications': 'Publications',
    'home.calendar.week': 'Week',
    'home.calendar.month': 'Month',
    'home.calendar.view': 'View',
    'home.calendar.previous': 'Previous',
    'home.calendar.today': 'Today',
    'home.calendar.next': 'Next',
    'home.calendar.more': '+{n} more',
    'home.calendar.nothing-went-out': 'Nothing went out',
    'home.calendar.nothing-scheduled': 'Nothing scheduled',
    'home.calendar.summary.none': 'No publications',
    'home.calendar.summary.published': '{n} published',
    'home.calendar.summary.pending': '{n} scheduled',
    'home.calendar.summary.failed': '{n} with failures',
    'home.calendar.untitled': '(deleted)',
    'home.calendar.types.episode': 'Podcast episode',
    'home.calendar.types.post': 'Blog post',
    'home.calendar.types.mogulStatus': 'Status',
    'home.day.publications': 'Publications',
    'home.day.nothing': 'Nothing went out on this day.',
    'home.day.publish': 'Publish',
    'home.day.schedule': 'Schedule for this day',
    'home.day.time': 'At',
    'home.day.past': 'This day has passed, so there is nothing more to publish on it.',
    'home.day.open': 'Open',

    'icon.alt.default': 'an image, #{image}',
    'icons.new-blog': 'New blog',
    'icons.new-podcast': 'New podcast',
    'icons.new-post': 'New post',
    'icons.new-episode': 'New episode',
    'icons.new-segment': 'New segment',
    'icons.new-note': 'New note',
    'icons.edit': 'Edit {name}',
    'icons.delete': 'Delete {name}',
    'icons.rss': 'RSS feed for {name}',
    'icons.edit-note': 'Edit note',
    'icons.delete-note': 'Delete note',
    'icons.delete-segment': 'Delete segment',
    'icons.delete-attachment': 'Delete attachment',
    'icons.attachments': 'Attachments',
    'icons.transcript': 'Transcript',
    'icons.audio-editor': 'Audio editor',
    'icons.move-up': 'Move up',
    'icons.move-down': 'Move down',
    'icons.segment-type.audio': 'Audio segment',
    'icons.segment-type.graphic': 'Image segment',
    'icons.segment-type.segment': 'Segment',
    'icons.hide-file': 'Hide file',
    'icons.show-file': 'Show file',
    'icons.uploaded': 'Uploaded',
    'icons.open-link': 'Open link',
    'icons.listen': 'Listen',
    'icons.withdraw': 'Withdraw publication',
    'icons.succeeded': 'Succeeded',
    'icons.failed': 'Failed',
    'icons.close': 'Close',
    'icons.show-password': 'Show password',
    'icons.bold': 'Bold',
    'icons.italic': 'Italic',
    'icons.link': 'Link',
    'icons.list': 'List',
    'icons.h1': 'Heading 1',
    'icons.h2': 'Heading 2',
    'icons.h3': 'Heading 3',
    'icons.image': 'Image',
    'icons.markdown': 'Markdown',
    'icons.writing-assistant': 'Writing assistant',

    'inputWrapperMenu.default-content':
      'the buttons should go here otherwise this will look like crap!',

    'markdown.nothing-to-preview': '(nothing to preview)',

    'blogs.posts': 'Posts',
    'blogs.posts.title': 'Posts',
    'blogs.posts.post': 'Blog Post',
    'blogs.posts.editing': 'Editing Post #{id}: {title}',
    'blogs.posts.new-post': 'New Post',
    'blogs.posts.basics': 'Basics',
    'blogs.posts.post.title': 'Title',
    'blogs.posts.post.created': 'Created',
    'blogs.posts.post.description': 'Description',
    'blogs.posts.post.summary': 'Summary',
    'blogs.posts.post.rss-slug': 'RSS Slug',
    'blogs.posts.post.visible': 'Visible',
    'blogs.posts.post.not-visible': 'Not visible',
    'blogs.posts.buttons.save': 'Save',
    'blogs.posts.buttons.cancel': 'Cancel',
    'blogs.posts.buttons.summarize': 'Summarize',
    'blogs.posts.buttons.summarizing': 'Summarizing',
    'blogs.posts.publications': 'Publications',
    'blogs.posts.posts-for': 'Posts for "{title}"',
    // episodes

    'compositions.attachments.drag-and-drop-attachments':
      'Drag one of the attachments onto the text editor to include it inline.',

    'podcasts.done': 'Done',
    'podcasts.episodes.episode': 'Episode',
    'podcasts.episodes': 'Episodes',
    'podcasts.episodes.title': 'Episodes in "{title}"',
    'podcasts.episodes.publications': 'Publications',
    'podcasts.episodes.publications.publishing': 'Publishing...',
    'podcasts.episodes.publications.producing':
      'Producing the audio for this episode. Publishing will continue by itself once the render finishes.',
    'podcasts.episodes.publications.production-failed':
      "The audio for this episode couldn't be produced. Nothing was published.",
    'podcasts.episodes.basics': 'Basics',
    'podcasts.episodes.segments': 'Segments',
    'podcasts.episodes.segments.prompt':
      "(don't forget to normalize your audio clips to the same sample rate and bit depth!)",
    'podcasts.episodes.segments.number': 'Episode segment # {id}',
    'podcasts.episodes.episodes': 'Episodes for Podcast #{id} - "{title}"',
    'podcasts.episodes.new-episode': 'New Episode',
    'podcasts.episodes.buttons.publish': 'Publish',
    'podcasts.episodes.buttons.cancel': 'Cancel',
    'podcasts.episodes.episode.segments.number': 'Segment {order}',
    'podcasts.episodes.episode.graphic': 'Graphic',
    'podcasts.episodes.episode.segments.audio-editor.close': 'Close the audio editor',
    'podcasts.episodes.episode.segments.audio-editor.loading': 'Loading the audio...',
    'podcasts.episodes.episode.segments.audio-editor.drawing': 'Drawing the waveform...',
    'podcasts.episodes.episode.segments.audio-editor.no-audio':
      'Upload audio for this segment first, then you can edit it here.',
    'podcasts.episodes.episode.segments.audio-editor.save': 'Save',
    'podcasts.episodes.episode.segments.audio-editor.not-cleaned':
      "This segment's audio couldn't be cleaned ({reason}), so you're editing the original.",
    'podcasts.episodes.episode.segments.audio-editor.filters.fillers': 'Shorten fillers',
    'podcasts.episodes.episode.segments.audio-editor.filters.stutters': 'Shorten stutters',
    'podcasts.episodes.episode.segments.audio-editor.filters.silences': 'Cut long silences',
    'podcasts.episodes.episode.segments.audio-editor.filters.longer-than': 'longer than (seconds)',
    'podcasts.episodes.episode.segments.audio-editor.filters.leave': 'leaving (seconds)',
    'podcasts.episodes.episode.segments.audio-editor.filters.hint':
      'Shaded parts of the track will be cut. Tap one to keep it.',
    'podcasts.episodes.episode.segments.audio-editor.marks.FILLER_SOUND': 'Filler (tap to keep)',
    'podcasts.episodes.episode.segments.audio-editor.marks.STUTTERING': 'Stutter (tap to keep)',
    'podcasts.episodes.episode.segments.audio-editor.marks.SILENCE': 'Long silence (tap to keep)',
    'podcasts.episodes.episode.segments.audio-editor.listen':
      'Listen to the edited audio, exactly as it will be in the episode',
    'podcasts.episodes.episode.segments.audio-editor.saving': 'Saving...',
    'podcasts.episodes.episode.segments.audio-editor.rendering':
      'Saved. Rendering the edited audio...',
    'podcasts.episodes.episode.segments.audio-editor.saved':
      'Saved, and the edited audio is ready.',
    'podcasts.episodes.episode.segments.audio-editor.save-failed':
      "Couldn't save the edits: {error}",
    'podcasts.episodes.episode.segments.audio-editor.render-failed':
      "The edits were saved, but the audio couldn't be rendered: {error}",
    'podcasts.episodes.episode.segments.audio-editor.error': "Couldn't load the audio: {error}",
    'podcasts.episodes.buttons.add-segment': 'Add a New Segment',
    'podcasts.episodes.episode.reference': 'the episode titled: {title}',
    'podcasts.episodes.all': "{title}'s episodes",
    'podcasts.episodes.episode.editing': 'Editing {id} "{title}"',
    'podcasts.episodes.episode.edit': 'Episode Editor',
    'podcasts.episodes.buttons.save': 'Save',
    'podcasts.episodes.episode.description.ai-prompt':
      'Please help me make this podcast episode description fun and pithy.',
    'podcasts.episodes.episode.title.ai-prompt':
      'Please help me make this podcast episode title fun and pithy.',
    'podcasts.episodes.episode.description': 'Description',
    'podcasts.episodes.episode.title': 'Title',
    'podcasts.episodes.episode.created': 'Created',
    'podcasts.episodes.plugins.please-select-a-plugin': 'Select a plugin',

    // podcasts
    'podcasts.title': 'Podcasts',
    'podcasts.all': "{user}'s podcasts",
    'podcasts.new-podcast': 'New Podcast',
    'podcasts.new-podcast.title': 'Title',
    'podcasts.title.ai.prompt': `Please help me take the following podcast title and make it more pithy and exciting!`,
    'podcasts.save': 'Save',
    'podcasts.editing': 'Editing {podcast}',
    'podcasts.podcasts.delete': 'Delete',

    // settings
    settings: {
      title: 'Settings',
      appearance: {
        title: 'Appearance',
        mode: 'Theme',
        modes: {
          auto: 'Automatic',
          light: 'Always light',
          dark: 'Always dark'
        },
        showing: 'Showing {theme} now.',
        'follow-system': "Go dark whenever this computer's appearance is dark",
        'evening-from': 'and every evening from',
        'evening-until': 'until',
        'evening-start': 'Evening starts at',
        'evening-end': 'Evening ends at',
        'dark-palette': 'Dark theme',
        palettes: {
          light: 'Daylight',
          midnight: 'Midnight',
          graphite: 'Graphite',
          ember: 'Ember'
        },
        blurbs: {
          midnight: 'The day theme after sunset: deep navy, sky blue accents.',
          graphite: 'Neutral console grey, so your artwork carries the color.',
          ember: 'Warm and low in blue for late nights, with an on-air amber.'
        }
      },
      'save-button': 'Save configuration changes for {plugin}',
      'no-configuration-for-plugin': 'No configuration settings for the {plugin} plugin',
      categories: {
        cleanvoice: {
          title: 'Cleanvoice',
          apiKey: 'Your Cleanvoice API key. With one, uploaded audio is cleaned automatically.',
          applyDefaultFilters:
            'Shorten fillers and stutters, and trim long silences, as soon as audio is cleaned'
        }
      }
    }
  }
}

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: translations,
  legacy: false, // why is this defaulted to true?
  warnHtmlInMessage: 'off'
})

// a screen reader picks its voice from <html lang>, so it follows the i18n locale
document.documentElement.lang = i18n.global.locale.value
watch(i18n.global.locale, (locale) => (document.documentElement.lang = locale))

// index.html already picked the palette for the first paint; this keeps it current
startTheme()

const app = createApp(App)

// v-calendar opens its date pickers on 'hover-focus' by default, which means a
// mousemove anywhere over the field is enough to throw the calendar over whatever is
// below it -- and tabbing past the field does it too. these sit in the middle of long
// edit forms, so that happens constantly and never on purpose. 'click' is the only
// visibility that needs to be asked for: click to open, click again (or outside, or
// escape) to close. typing into the field still works either way.
app.use(setupCalendar, {
  datePicker: {
    popover: {
      visibility: 'click'
    }
  }
})

// Use the components
app.component('VCalendar', Calendar)
app.component('VDatePicker', DatePicker)

app.use(i18n)
app.use(router)
app.use(createPinia())

app.mount('#app')
