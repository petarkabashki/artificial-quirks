import type { CardListData, Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

/** Visual theme (design tokens/typography), independent of the light/dark mode toggle. */
export type SiteTheme = 'default' | 'editorial'
/** Active visual theme for the whole site. Switch and revert by changing this value. */
export const activeTheme: SiteTheme = 'editorial'

export const theme: ThemeUserConfig = {
  // [Basic]
  /** Title for your website. Will be used in metadata and as browser tab title. */
  title: 'Artificial Quirks',
  /** Will be used in index page & copyright declaration */
  author: 'Artificial Quirks',
  /** Description metadata for your website. Can be used in page metadata. */
  description:
    'Industry notes on agent systems, evaluation, and production Agentic AI for architects and platform leads—quirks included.',
  /** The default favicon for your site which should be a path to an image in the `public/` directory. */
  favicon: '/favicon/favicon.ico',
  /** The default social card image for your site which should be a path to an image in the `public/` directory. */
  socialCard: '/images/social-card.png',
  /** Specify the default language for this site. */
  locale: {
    lang: 'en-US',
    attrs: 'en_US',
    // Date locale
    dateLocale: 'en-US',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  /** Set a logo image to show in the homepage. */
  logo: {
    src: '/src/assets/avatar.png',
    alt: 'Artificial Quirks'
  },

  titleDelimiter: '·',
  prerender: true, // pagefind search is not supported with prerendering disabled
  npmCDN: 'https://cdn.jsdelivr.net/npm',

  // Still in test
  head: [],
  customCss: [],

  /** Configure the header of your site. */
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Services', link: '/services' },
      { title: 'About', link: '/about' }
    ]
  },

  /** Configure the footer of your site. */
  footer: {
    // Year format
    year: `© ${new Date().getFullYear()}`,
    links: [
      {
        title: 'Site Policy',
        link: '/terms',
        pos: 2 // position set to 2 will be appended to copyright line
      }
    ],
    /** Theme credit link in footer */
    credits: false,
    /** Optional details about the social media accounts for this site. */
    social: [{ icon: 'rss', label: 'RSS', href: '/rss.xml' }]
  },

  // [Content]
  content: {
    /** External links configuration */
    externalLinks: {
      content: ' ↗',
      /** Properties for the external links element */
      properties: { style: 'user-select:none' }
    },
    /** Blog page size for pagination (optional) */
    blogPageSize: 8,
    /** Share buttons to show */
    // Currently support weibo, x, bluesky
    share: ['x', 'bluesky']
    /** Enable image captions (default false) */
    // imageCaption: true
  }
}

export const integ: IntegrationUserConfig = {
  // [Links]
  // https://astro-pure.js.org/docs/integrations/links
  links: {
    logbook: [],
    applyTip: [
      { name: 'Name', val: theme.title },
      { name: 'Desc', val: theme.description || 'Null' },
      { name: 'Link', val: 'https://artificialquirks.com/' },
      { name: 'Avatar', val: 'https://artificialquirks.com/favicon/favicon.ico' }
    ],
    cacheAvatar: false
  },
  // [Search]
  pagefind: true,
  // Homepage no longer renders a remote quote (avoids "Loading…" as last impression).
  // Keep a no-op-safe stub if other templates expect integ.quote.
  quote: {
    server: '',
    target: `() => ''`
  },
  // [Typography]
  // https://unocss.dev/presets/typography
  typography: {
    class: 'prose text-base',
    // The style of blockquote font `normal` / `italic` (default to italic in typography)
    blockquoteStyle: 'italic',
    // The style of inline code block `code` / `modern` (default to code in typography)
    inlineCodeBlockStyle: 'modern'
  },
  // [Lightbox]
  // A lightbox library that can add zoom effect
  // https://astro-pure.js.org/docs/integrations/others#medium-zoom
  mediumZoom: {
    enable: true, // disable it will not load the whole library
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  // Comment system
  waline: {
    enable: false,
    // Server service link
    server: 'https://astro-theme-pure-waline.arthals.ink/',
    // Show meta info for comments
    showMeta: false,
    // Refer https://waline.js.org/en/guide/features/emoji.html
    emoji: ['bmoji', 'weibo'],
    // Refer https://waline.js.org/en/reference/client/props.html
    additionalConfigs: {
      // search: false,
      pageview: true,
      comment: false,
      locale: {
        reaction0: 'Like',
        placeholder: 'Welcome to comment. (Email to receive replies. Login is unnecessary)'
      },
      imageUploader: false
    }
  }
}

export const terms: CardListData = {
  title: 'Terms content',
  list: [
    {
      title: 'Privacy Policy',
      link: '/terms/privacy-policy'
    },
    {
      title: 'Terms and Conditions',
      link: '/terms/terms-and-conditions'
    },
    {
      title: 'Copyright',
      link: '/terms/copyright'
    },
    {
      title: 'Disclaimer',
      link: '/terms/disclaimer'
    }
  ]
}

const config = { ...theme, integ } as Config
export default config

/**
 * Public inquiry address for Services CTAs.
 * Set when ready, e.g. 'hello@artificialquirks.com'. Empty = no mailto button.
 */
export const siteContact = {
  email: '' as string
}
