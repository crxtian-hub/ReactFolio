import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import fliesneverlieLogoUrl from './assets/about-designer/fliesneverlielogo.svg'

const logoFrameUrls = Object.entries(
  import.meta.glob('./assets/logo-loop/*.svg', { eager: true, import: 'default' }),
)
.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
.map(([, url]) => url)

const logoFrameSvgs = Object.entries(
  import.meta.glob('./assets/logo-loop/*.svg', { eager: true, query: '?raw', import: 'default' }),
)
.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
.map(([, svg]) => svg)

const preloaderFrameSvgs = Object.entries(
  import.meta.glob('./assets/preloader/*.svg', { eager: true, query: '?raw', import: 'default' }),
)
.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
.map(([, svg]) => svg)

const aboutHeartFrames = Object.entries(
  import.meta.glob('./assets/about-hearts/*.svg', { eager: true, import: 'default' }),
)
.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
.map(([, url]) => url)

const aboutHeartFrameDurationsMs = [180, 420, 250]

const rawWorkAssetEntries = Object.entries(
  import.meta.glob('./assets/works/*/*.{avif,gif,jpg,jpeg,mp4,png,svg,webm,webp}', {
    eager: true,
    import: 'default',
  }),
)

const workVideoThumbnailEntries = Object.entries(
  import.meta.glob('./assets/works/*/thumbs/*.{avif,jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default',
  }),
)

const VIDEO_ASSET_EXTENSION_PATTERN = /\.(mp4|webm)(?:$|\?)/

const isVideoAsset = (assetUrl) =>
  typeof assetUrl === 'string' && VIDEO_ASSET_EXTENSION_PATTERN.test(assetUrl)

const getAssetStem = (fileName) => fileName.replace(/\.[^.]+$/, '')

const videoAssetsByKey = rawWorkAssetEntries.reduce((acc, [assetPath, assetUrl]) => {
  const match = assetPath.match(/^\.\/assets\/works\/([^/]+)\/([^/]+)\.(mp4|webm)$/)
  if (!match) {
    return acc
  }

  const [, folderName, fileStem, extension] = match
  const assetKey = `${folderName}/${fileStem}`
  acc[assetKey] = {
    ...acc[assetKey],
    [extension]: assetUrl,
  }
  return acc
}, {})

const workVideoSourcesByAssetUrl = new Map()

Object.values(videoAssetsByKey).forEach(({ mp4, webm }) => {
  const canonicalUrl = webm ?? mp4
  const sources = [
    mp4 ? { src: mp4, type: 'video/mp4' } : null,
    webm ? { src: webm, type: 'video/webm' } : null,
  ].filter(Boolean)

  if (canonicalUrl) {
    workVideoSourcesByAssetUrl.set(canonicalUrl, sources)
  }
})

const workAssetEntries = rawWorkAssetEntries.filter(([assetPath]) => {
  const match = assetPath.match(/^\.\/assets\/works\/([^/]+)\/([^/]+)\.mp4$/)
  if (!match) {
    return true
  }

  const [, folderName, fileStem] = match
  return !videoAssetsByKey[`${folderName}/${fileStem}`]?.webm
})

const getWorkVideoSources = (assetUrl) =>
  workVideoSourcesByAssetUrl.get(assetUrl) ?? [{ src: assetUrl }]

const workVideoThumbnailsByKey = Object.fromEntries(
  workVideoThumbnailEntries
  .map(([assetPath, assetUrl]) => {
    const match = assetPath.match(/^\.\/assets\/works\/([^/]+)\/thumbs\/([^/]+)$/)
    if (!match) {
      return null
    }

    const [, folderName, fileName] = match
    return [`${folderName}/${getAssetStem(fileName)}`, assetUrl]
  })
  .filter(Boolean),
)

const videoThumbnailUrlsByAssetUrl = new Map()

const sortWorkAssetEntries = (entries) => {
  const sortedByName = [...entries].sort((a, b) =>
    a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }),
)
const firstCoverIndex = sortedByName.findIndex((entry) => /cover/i.test(entry.fileName))
const sortedWithCoverFirst = [...sortedByName]

if (firstCoverIndex > 0) {
  const [coverEntry] = sortedWithCoverFirst.splice(firstCoverIndex, 1)
  sortedWithCoverFirst.unshift(coverEntry)
}

const coverEntry = sortedWithCoverFirst.find((entry) => /cover/i.test(entry.fileName))
const nonCoverEntries = sortedWithCoverFirst.filter((entry) => entry !== coverEntry)
const videoEntries = nonCoverEntries.filter((entry) => isVideoAsset(entry.url))
const imageEntries = nonCoverEntries.filter((entry) => !isVideoAsset(entry.url))

return coverEntry ? [coverEntry, ...videoEntries, ...imageEntries] : [...videoEntries, ...imageEntries]
}

const workImagesByFolder = Object.fromEntries(
  Object.entries(
    workAssetEntries.reduce((acc, [assetPath, assetUrl]) => {
      const match = assetPath.match(/^\.\/assets\/works\/([^/]+)\/([^/]+)$/)
      if (!match) {
        return acc
      }
      
      const [, folderName, fileName] = match
      if (!acc[folderName]) {
        acc[folderName] = []
      }
      
      acc[folderName].push({
        fileName,
        url: assetUrl,
      })

      if (isVideoAsset(assetUrl)) {
        const thumbnailUrl = workVideoThumbnailsByKey[`${folderName}/${getAssetStem(fileName)}`]
        if (thumbnailUrl) {
          videoThumbnailUrlsByAssetUrl.set(assetUrl, thumbnailUrl)
        }
      }

      return acc
    }, {}),
  ).map(([folderName, entries]) => [folderName, sortWorkAssetEntries(entries).map((entry) => entry.url)]),
)

const getWorkThumbnailUrl = (assetUrl) => videoThumbnailUrlsByAssetUrl.get(assetUrl) ?? assetUrl
const generatedVideoThumbnailUrls = new Map()
const EMPTY_THUMBNAIL_DATA_URL =
'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

const DEFAULT_WORK_DETAIL_IMAGE_URL =
'https://cdn.cosmos.so/5f8a6c45-5593-49e2-8f89-a878f01bfbc8?format=jpeg'
const DEFAULT_DOCUMENT_TITLE = 'crxtianhub — Independent Developer'

const works = [
  {
    slug: 'through-the-curtains',
    legacySlugs: ['work-01'],
    title: 'Through the Curtains',
    titleLines: ['THROUGH', 'THE CURTAINS'],
    year: '2024',
    meta: {
      services: 'Motion, Design and web development',
      client: 'IED Milan Thesis for Fashion Styling Students',
      exploreUrl: 'https://throughthecurtains.vercel.app/',
    },
    assetsFolder: 'TTC_work',
    detailImages: [DEFAULT_WORK_DETAIL_IMAGE_URL],
    startCol: 3,
    offsetVw: -2,
  },
  {
    slug: 'a-m-photographer',
    legacySlugs: ['work-02'],
    title: 'AM Photographer',
    titleLines: ['AM', 'PHOTOGRAPHER'],
    year: '2025',
    meta: {
      services: 'Design by Francesco Caronte Motion And Development by me',
      client: 'Andrea Mortelliti Photographer Portfolio',
      exploreUrl: 'https://www.andreamortelliti.it/',
    },
    assetsFolder: 'AM_work',
    detailImages: [DEFAULT_WORK_DETAIL_IMAGE_URL],
    startCol: 5,
    offsetVw: 5,
  },
  {
    slug: 'msb-portfolio',
    legacySlugs: ['work-03'],
    title: 'MSB Portfolio',
    titleLines: ['MSB', 'STYLIST'],
    year: '2026',
    meta: {
      services: 'Design by fliesneverlie fullstack and motion by me',
      client: 'Maria Sofia Brini, Fashion Styling Portfolio',
      isComingSoon: true,
    },
    assetsFolder: 'MSB_work',
    detailImages: [DEFAULT_WORK_DETAIL_IMAGE_URL],
    startCol: 8,
    offsetVw: 19,
  },
  {
    slug: 'm-q-portfolio',
    legacySlugs: ['work-04'],
    title: 'MQ Portfolio',
    titleLines: ['MQ', 'STYLIST'],
    year: '2026',
    meta: {
      services: 'Design by fliesneverlie fullstack and motion by me',
      client: 'Marina Quaranta, Fashion Portfolio',
      exploreUrl: 'https://www.marinaquaranta.com/',
    },
    assetsFolder: 'MQ_work',
    detailImages: [DEFAULT_WORK_DETAIL_IMAGE_URL],
    startCol: 10,
    offsetVw: 13,
  },
]

const getWorkExploreMeta = (work) => {
  const rawExploreUrl = work.meta?.exploreUrl
  const exploreUrl = typeof rawExploreUrl === 'string' ? rawExploreUrl.trim() : ''
  const hasExploreUrl = exploreUrl.length > 0
  const isComingSoon = Boolean(work.meta?.isComingSoon) || !hasExploreUrl
  const rawExploreLabel = work.meta?.exploreLabel
  const exploreLabel =
  typeof rawExploreLabel === 'string' && rawExploreLabel.trim().length > 0
  ? rawExploreLabel.trim()
  : isComingSoon
  ? 'Coming Soon'
  : 'EXPLORE'
  
  return {
    label: exploreLabel,
    href: isComingSoon ? '' : exploreUrl,
  }
}

const getWorkDetailImages = (work) => {
  const assetsFolder =
  work && typeof work.assetsFolder === 'string' ? work.assetsFolder.trim() : ''
  const localWorkImages = assetsFolder.length > 0 ? workImagesByFolder[assetsFolder] ?? [] : []
  if (localWorkImages.length > 0) {
    return localWorkImages
  }
  
  if (!work || !Array.isArray(work.detailImages)) {
    return []
  }
  
  return work.detailImages
  .filter((image) => typeof image === 'string')
  .map((image) => image.trim())
  .filter((image) => image.length > 0)
}

const getWorkPrimaryImageUrl = (work) => {
  const [firstImage] = getWorkDetailImages(work)
  return firstImage ?? INDEX_WORK_COVER_IMAGE_URL
}

const WORK_META_COLUMNS = [
  {
    key: 'services',
    gridColumn: '3 / span 2',
    getValue: (work) => work.meta?.services ?? '',
  },
  {
    key: 'client',
    gridColumn: '5 / span 2',
    getValue: (work) => work.meta?.client ?? '',
  },
  {
    key: 'year',
    gridColumn: '7 / span 1',
    getValue: (work) => work.year ?? '',
  },
  {
    key: 'explore',
    gridColumn: '8 / span 1',
    getValue: (work) => getWorkExploreMeta(work).label,
    getHref: (work) => getWorkExploreMeta(work).href,
  },
]

const normalizePath = (pathname) => {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '' ? '/' : normalized
}

const getWorkBySlug = (slug) => {
  if (typeof slug !== 'string' || slug.length === 0) {
    return null
  }

  return (
    works.find(
      (work) => work.slug === slug || (Array.isArray(work.legacySlugs) && work.legacySlugs.includes(slug)),
    ) ?? null
  )
}

const getWorkPath = (work) => `/work/${work.slug}`

const getWorkTitleLines = (work) => {
  if (!work) {
    return ['']
  }
  
  if (Array.isArray(work.titleLines) && work.titleLines.length > 0) {
    return work.titleLines.map((line) => (typeof line === 'string' ? line : ''))
  }
  
  return [typeof work.title === 'string' ? work.title : '']
}

const getWorkOrderLabel = (index) => `${String(index + 1).padStart(2, '0')}_`

const TITLE_REVEAL_MAX_DELAY_MS = 360
const TITLE_REVEAL_MIN_DURATION_MS = 220
const TITLE_REVEAL_DURATION_RANGE_MS = 220
const TITLE_REVEAL_MAX_DURATION_MS = TITLE_REVEAL_MIN_DURATION_MS + TITLE_REVEAL_DURATION_RANGE_MS
const TITLE_REVEAL_TOTAL_MS = TITLE_REVEAL_MAX_DELAY_MS + TITLE_REVEAL_MAX_DURATION_MS
const TITLE_REVEAL_EXIT_BUFFER_MS = 60
const TITLE_REVEAL_EXIT_WAIT_MS = TITLE_REVEAL_TOTAL_MS + TITLE_REVEAL_EXIT_BUFFER_MS
const WORK_TO_INDEX_EXIT_WAIT_MS = TITLE_REVEAL_EXIT_WAIT_MS
const WORK_FLIP_DURATION_MS = 1040
const MOBILE_WORK_FLIP_DURATION_MS = 760
const WORK_FLIP_EASING = 'cubic-bezier(0.24, 0.9, 0.36, 1)'
const ENABLE_INDEX_KICKER_ANIMATION = true
const WORK_RETURN_STAGGER_MS = 52
const WORK_RETURN_RESET_BUFFER_MS = 160
const WORK_GALLERY_ITEM_STAGGER_MS = 95
const WORK_GALLERY_RETURN_DURATION_MS = 1500
const WORK_GALLERY_RETURN_STAGGER_RATIO = 0.45
const INDEX_KICKER_EXIT_DURATION_MS = 370
const INDEX_KICKER_RETURN_DURATION_MS = 520
const INDEX_WORK_COVER_IMAGE_URL = DEFAULT_WORK_DETAIL_IMAGE_URL
const LOGO_BASE_FRAME_INTERVAL_MS = 750
const LOGO_TRANSITION_FRAME_INTERVAL_MS = 96
const LOGO_TRANSITION_BOOST_MS = 760
const PRELOADER_FRAME_INTERVAL_MS = 333
const PRELOADER_EXIT_DURATION_MS = 520
const PRELOADER_INDEX_INTRO_START_DELAY_MS = 240
const WORK_THUMB_SLIDER_EXTRA_X = 6
const WORK_THUMB_SLIDER_EXTRA_Y = 20
const WORK_PAGE_COVER_LEAVE_DURATION_MS = 800
const WORK_PAGE_COVER_SLIDE_DURATION_MS = 1040
const WORK_GALLERY_NAV_LEAVE_DURATION_MS = 800
const WORK_GALLERY_NAV_ENTER_DURATION_MS = 1500
const WORK_THUMB_EXIT_SWAP_BUFFER_MS = 120
const WORK_THUMB_ENTER_DURATION_MS = 860
const WORK_PROJECT_NAV_DETAILS_DELAY_MS = 360
const WORK_PROJECT_NAV_SCROLL_SETTLE_MS = 240
const WORK_GALLERY_MORPH_STAGGER_MS = 72
const WORK_GALLERY_NAV_LEAVE_DELAY_MS = 0
const WORK_GALLERY_NAV_ENTER_DELAY_MS =
  WORK_GALLERY_NAV_LEAVE_DELAY_MS + WORK_GALLERY_NAV_LEAVE_DURATION_MS + 80
const WORK_SHOW_SCROLL_TOP_SETTLE_FRAMES = 2
const WORK_SHOW_ROUTE_SCROLL_RESET_FRAMES = 3
const INDEX_INTRO_DURATION_MS = 2900
const DESIGNER_LOGO_CURSOR_LEAVE_DELAY_MS = 2000
const preloadedImageUrls = new Set()
const preloadingImagePromises = new Map()

const preloadImageUrl = (imageUrl) => {
  if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
    return Promise.resolve()
  }
  
  const normalizedImageUrl = imageUrl.trim()
  if (preloadedImageUrls.has(normalizedImageUrl)) {
    return Promise.resolve()
  }
  
  const existingPromise = preloadingImagePromises.get(normalizedImageUrl)
  if (existingPromise) {
    return existingPromise
  }
  
  const preloadPromise = new Promise((resolve) => {
    const image = new Image()
    let hasSettled = false
    
    const finish = () => {
      if (hasSettled) {
        return
      }
      
      hasSettled = true
      preloadedImageUrls.add(normalizedImageUrl)
      preloadingImagePromises.delete(normalizedImageUrl)
      resolve()
    }
    
    const decodeImage = () => {
      if (typeof image.decode === 'function') {
        image.decode().catch(() => undefined).finally(finish)
        return
      }
      
      finish()
    }
    
    image.onload = decodeImage
    image.onerror = finish
    image.decoding = 'async'
    image.src = normalizedImageUrl
    
    if (image.complete) {
      decodeImage()
    }
  })
  
  preloadingImagePromises.set(normalizedImageUrl, preloadPromise)
  return preloadPromise
}

const getWorkShowPageRealMaxScrollTop = (workShowPageNode) => {
  const fallbackMaxScrollTop = Math.max(0, workShowPageNode.scrollHeight - workShowPageNode.clientHeight)
  const galleryNode = workShowPageNode.querySelector('.work-show-gallery')

  if (!(galleryNode instanceof HTMLElement)) {
    return fallbackMaxScrollTop
  }

  const pageStyles = window.getComputedStyle(workShowPageNode)
  const paddingBottom = Number.parseFloat(pageStyles.paddingBottom) || 0
  const realContentBottom = galleryNode.offsetTop + galleryNode.offsetHeight + paddingBottom

  return Math.max(0, realContentBottom - workShowPageNode.clientHeight)
}

const getCssUrlValue = (assetUrl) =>
  typeof assetUrl === 'string' && assetUrl.length > 0
  ? `url("${assetUrl.replace(/"/g, '\\"')}")`
  : 'none'

const WorkMedia = ({
  alt = '',
  ariaLabel,
  className,
  eager = false,
  src,
}) => {
  if (isVideoAsset(src)) {
    return (
      <video
      className={className}
      aria-label={ariaLabel}
      autoPlay
      loop
      muted
      playsInline
      preload={eager ? 'auto' : 'metadata'}
      >
      {getWorkVideoSources(src).map((source) => (
        <source key={source.src} src={source.src} type={source.type} />
      ))}
      </video>
    )
  }

  return (
    <img
    className={className}
    src={src}
    alt={alt}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={eager ? 'high' : undefined}
    />
  )
}

const WorkThumbnailMedia = ({
  alt = '',
  className,
  src,
}) => {
  const staticThumbnailUrl = getWorkThumbnailUrl(src)
  const shouldGenerateVideoThumbnail = isVideoAsset(src) && staticThumbnailUrl === src
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState(() =>
    shouldGenerateVideoThumbnail ? generatedVideoThumbnailUrls.get(src) ?? null : null,
  )
  const resolvedGeneratedThumbnailUrl =
  shouldGenerateVideoThumbnail ? generatedThumbnailUrl ?? generatedVideoThumbnailUrls.get(src) ?? null : null

  useEffect(() => {
    if (!shouldGenerateVideoThumbnail) {
      return undefined
    }

    if (generatedVideoThumbnailUrls.has(src)) {
      return undefined
    }

    let isCancelled = false
    const video = document.createElement('video')
    const [thumbnailSource] = getWorkVideoSources(src)
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = thumbnailSource?.src ?? src

    const captureFrame = () => {
      if (isCancelled || video.videoWidth <= 0 || video.videoHeight <= 0) {
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.82)
      generatedVideoThumbnailUrls.set(src, thumbnailUrl)
      setGeneratedThumbnailUrl(thumbnailUrl)
    }

    const onLoadedMetadata = () => {
      if (isCancelled) {
        return
      }

      const targetTime = Math.min(0.12, Math.max(0, (video.duration || 0) - 0.01))
      if (Number.isFinite(targetTime) && targetTime > 0) {
        video.currentTime = targetTime
        return
      }

      captureFrame()
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
    video.addEventListener('loadeddata', captureFrame, { once: true })
    video.addEventListener('seeked', captureFrame, { once: true })
    video.load()

    return () => {
      isCancelled = true
      video.removeAttribute('src')
      video.load()
    }
  }, [shouldGenerateVideoThumbnail, src])

  return (
    <img
    className={className}
    src={shouldGenerateVideoThumbnail ? resolvedGeneratedThumbnailUrl ?? EMPTY_THUMBNAIL_DATA_URL : staticThumbnailUrl}
    alt={alt}
    loading="lazy"
    decoding="async"
    />
  )
}

const getWorkSlugFromPath = (pathname) => {
  const normalized = normalizePath(pathname)
  const match = normalized.match(/^\/work\/([^/]+)$/)
  const work = match ? getWorkBySlug(match[1]) : null
  return work ? work.slug : null
}

const isPrimaryClick = (event) => {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  )
}

const getFallbackWorkMetrics = () => {
  const viewportWidth = window.innerWidth
  const gridWidth = viewportWidth * 0.95
  const gridGap = viewportWidth * 0.01
  const gridLeft = (viewportWidth - gridWidth) / 2
  const columnWidth = (gridWidth - gridGap * 11) / 12
  const step = columnWidth + gridGap
  
  return {
    step,
    halfColWidth: columnWidth / 2,
    twoColWidth: columnWidth * 2 + gridGap,
    sixColWidth: columnWidth * 6 + gridGap * 5,
    targetCol4Left: gridLeft + step * 3,
    targetTop: viewportWidth * 0.146,
  }
}

const getWorkMetrics = (worksStripElement) => {
  if (!worksStripElement) {
    return getFallbackWorkMetrics()
  }
  
  const stripRect = worksStripElement.getBoundingClientRect()
  const computedStyle = window.getComputedStyle(worksStripElement)
  const gridGap = Number.parseFloat(computedStyle.columnGap) || 0
  const columnWidth = (stripRect.width - gridGap * 11) / 12
  const step = columnWidth + gridGap
  
  return {
    step,
    halfColWidth: columnWidth / 2,
    twoColWidth: columnWidth * 2 + gridGap,
    sixColWidth: columnWidth * 6 + gridGap * 5,
    targetCol4Left: stripRect.left + step * 3,
    targetTop: window.innerWidth * 0.146,
  }
}

const clearWorkTransitionStyles = (element) => {
  element.style.removeProperty('position')
  element.style.removeProperty('left')
  element.style.removeProperty('top')
  element.style.removeProperty('z-index')
  element.style.removeProperty('transform-origin')
  element.style.removeProperty('transition')
  element.style.removeProperty('translate')
  element.style.removeProperty('scale')
  element.style.removeProperty('width')
  element.style.removeProperty('height')
  element.style.removeProperty('will-change')
}

const clearWorkKickerClasses = (element) => {
  if (!(element instanceof HTMLElement)) {
    return
  }
  
  element.classList.remove('is-kicker-slotting')
  element.classList.remove('is-kicker-exiting')
  element.classList.remove('is-kicker-return-prep')
  element.classList.remove('is-kicker-returning')
}

const clearWorkKickerInlineAnimation = (element) => {
  if (!(element instanceof HTMLElement)) {
    return
  }

  const currentKickerNode = element.querySelector('.work-cover-kicker.is-current')
  if (!(currentKickerNode instanceof HTMLElement)) {
    return
  }

  currentKickerNode.style.removeProperty('transition')
  currentKickerNode.style.removeProperty('transform')
  currentKickerNode.style.removeProperty('will-change')
}

const getWorkKickerSnapshot = (workNode) => {
  const kickerNode = workNode.querySelector('.work-cover-kicker')
  if (!(kickerNode instanceof HTMLElement)) {
    return null
  }
  
  const kickerRect = kickerNode.getBoundingClientRect()
  if (kickerRect.width <= 0 || kickerRect.height <= 0) {
    return null
  }
  
  const kickerText = kickerNode.textContent?.trim() ?? ''
  if (kickerText.length === 0) {
    return null
  }
  
  const kickerStyle = window.getComputedStyle(kickerNode)
  
  return {
    text: kickerText,
    left: kickerRect.left,
    top: kickerRect.top,
    color: kickerStyle.color,
    fontFamily: kickerStyle.fontFamily,
    fontSize: kickerStyle.fontSize,
    fontWeight: kickerStyle.fontWeight,
    lineHeight: kickerStyle.lineHeight,
    letterSpacing: kickerStyle.letterSpacing,
  }
}

function App() {
  const [showGrid, setShowGrid] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [preloaderFrameIndex, setPreloaderFrameIndex] = useState(0)
  const [preloaderCounter, setPreloaderCounter] = useState(0)
  const [isPreloaderActive, setIsPreloaderActive] = useState(() => preloaderFrameSvgs.length > 0)
  const [isPreloaderExiting, setIsPreloaderExiting] = useState(false)
  const [loadedLogoFrames, setLoadedLogoFrames] = useState(() => new Set())
  const [isLogoRainbowBoost, setIsLogoRainbowBoost] = useState(false)
  const [route, setRoute] = useState(() => normalizePath(window.location.pathname))
  const [aboutReturnPath, setAboutReturnPath] = useState(() => {
    const historyState = window.history.state
    const rawReturnPath = historyState?.aboutReturnPath

    if (typeof rawReturnPath !== 'string' || rawReturnPath.trim().length === 0) {
      return null
    }

    return normalizePath(rawReturnPath)
  })
  const [workMetrics, setWorkMetrics] = useState(() => getFallbackWorkMetrics())
  const [workTransitionSnapshot, setWorkTransitionSnapshot] = useState(null)
  const [workProjectNavDirection, setWorkProjectNavDirection] = useState(null)
  const [workPageCoverSlide, setWorkPageCoverSlide] = useState(null)
  const [lockedWorkSlug, setLockedWorkSlug] = useState(null)
  const [isProjectNavContentReveal, setIsProjectNavContentReveal] = useState(false)
  const [isProjectNavHandoffSettling, setIsProjectNavHandoffSettling] = useState(false)
  const [isWorkTitleClosing, setIsWorkTitleClosing] = useState(false)
  const [isWorkTitleExitComplete, setIsWorkTitleExitComplete] = useState(false)
  const [workGalleryMorph, setWorkGalleryMorph] = useState(null)
  const [isReturningToIndex, setIsReturningToIndex] = useState(false)
  const [returningSourceSlug, setReturningSourceSlug] = useState(null)
  const [returningKickerSlug, setReturningKickerSlug] = useState(null)
  const [isProjectNavIndexEntry, setIsProjectNavIndexEntry] = useState(false)
  const [isWorkMetaEntering, setIsWorkMetaEntering] = useState(false)
  const [isProjectNavScrollSettling, setIsProjectNavScrollSettling] = useState(false)
  const [workShowKickerTransition, setWorkShowKickerTransition] = useState(null)
  const [workShowKickerIsAnimating, setWorkShowKickerIsAnimating] = useState(false)
  const [workThumbSliderRect, setWorkThumbSliderRect] = useState(null)
  const [isWorkThumbsSwitching, setIsWorkThumbsSwitching] = useState(false)
  const [isWorkThumbsEntering, setIsWorkThumbsEntering] = useState(false)
  const [isFreakHovered, setIsFreakHovered] = useState(false)
  const [isDesignerLogoCursorActive, setIsDesignerLogoCursorActive] = useState(false)
  const [designerLogoCursorPosition, setDesignerLogoCursorPosition] = useState({ x: 0, y: 0 })
  const [activeAboutHeartIndex, setActiveAboutHeartIndex] = useState(0)
  const [isLogoHovered, setIsLogoHovered] = useState(false)
  const [isIndexIntroActive, setIsIndexIntroActive] = useState(() => {
    if (route !== '/' || typeof window === 'undefined') {
      return false
    }

    if (preloaderFrameSvgs.length > 0) {
      return false
    }

    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const pageStageRef = useRef(null)
  const worksStripRef = useRef(null)
  const workShowPageRef = useRef(null)
  const workThumbsRef = useRef(null)
  const freakRef = useRef(null)
  const workCoverRefs = useRef(new Map())
  const workThumbRefs = useRef(new Map())
  const workTitleExitTimeoutRef = useRef(null)
  const workThumbsRevealTimeoutRef = useRef(null)
  const workGalleryMorphTimeoutRef = useRef(null)
  const projectNavScrollSettleTimeoutRef = useRef(null)
  const projectNavRequestIdRef = useRef(0)
  const projectNavRouteTimeoutRef = useRef(null)
  const projectNavHandoffTimeoutRef = useRef(null)
  const pendingWorkThumbsRouteRef = useRef(null)
  const logoBoostTimeoutRef = useRef(null)
  const returnToIndexTimeoutRef = useRef(null)
  const indexKickerExitTimeoutRef = useRef(null)
  const indexIntroTimeoutRef = useRef(null)
  const preloaderAnimationFrameRef = useRef(null)
  const preloaderCompleteTimeoutRef = useRef(null)
  const preloaderExitTimeoutRef = useRef(null)
  const workTitleClosingStartedAtRef = useRef(null)
  const workTitleExitCompleteTimeoutRef = useRef(null)
  const designerLogoCursorTimeoutRef = useRef(null)
  const workTopScrollRequestRef = useRef(0)
  const loadedLogoFramesRef = useRef(new Set())
  const previousRouteRef = useRef(route)
  const workGalleryMorphRef = useRef(workGalleryMorph)
  
  const totalFrames = logoFrameUrls.length
  const totalPreloaderFrames = preloaderFrameSvgs.length
  const isAboutPage = route === '/about'
  const visibleRoute = isAboutPage && aboutReturnPath !== null ? aboutReturnPath : route
  const routeWorkSlug = getWorkSlugFromPath(visibleRoute)
  const activeWorkSlug = routeWorkSlug === null ? null : lockedWorkSlug ?? routeWorkSlug
  const activeWork = activeWorkSlug !== null ? works.find((work) => work.slug === activeWorkSlug) ?? null : null
  const returningWork =
    returningSourceSlug !== null ? works.find((work) => work.slug === returningSourceSlug) ?? null : null
  const visibleWork = activeWork ?? (isReturningToIndex ? returningWork : null)
  const visibleWorkSlug = visibleWork?.slug ?? null
  const activeWorkIndex = activeWork ? works.findIndex((work) => work.slug === activeWork.slug) : -1
  const visibleWorkIndex = visibleWork ? works.findIndex((work) => work.slug === visibleWork.slug) : -1
  const returningSourceIndex =
  returningSourceSlug !== null ? works.findIndex((work) => work.slug === returningSourceSlug) : -1
  const transitionAnchorIndex =
  activeWorkIndex >= 0 ? activeWorkIndex : isReturningToIndex ? returningSourceIndex : -1
  const previousWork =
  activeWorkIndex >= 0 ? works[(activeWorkIndex - 1 + works.length) % works.length] : null
  const nextWork = activeWorkIndex >= 0 ? works[(activeWorkIndex + 1) % works.length] : null
  const isWorkPage = Boolean(activeWork)
  const isWorkShowVisible = isWorkPage || (isReturningToIndex && Boolean(visibleWork))
  const isIndexIntroVisible = isIndexIntroActive && route === '/'
  const workProjectNavDirectionClass =
  workProjectNavDirection === 'next'
  ? ' is-project-nav-next'
  : workProjectNavDirection === 'prev'
  ? ' is-project-nav-prev'
  : ''
  const pageStageProjectNavClass =
  workProjectNavDirection === 'next' || workProjectNavDirection === 'prev'
  ? ' is-project-nav-transition'
  : ''
  const isProjectNavSliding = Boolean(workPageCoverSlide)
  const isIndexTransitionSourceWork =
  workTransitionSnapshot !== null &&
  workTransitionSnapshot.sourcePath === '/' &&
  getWorkSlugFromPath(workTransitionSnapshot.targetPath) !== null &&
  workTransitionSnapshot.slug === visibleWorkSlug
  const isIndexToWorkTransition =
  workTransitionSnapshot !== null &&
  workTransitionSnapshot.sourcePath === '/' &&
  getWorkSlugFromPath(workTransitionSnapshot.targetPath) !== null
  const workDetailsAppearDelayMs = isProjectNavSliding
  || isProjectNavContentReveal
  ? WORK_PROJECT_NAV_DETAILS_DELAY_MS
  : TITLE_REVEAL_TOTAL_MS
  const workMetaAppearDelayMs = isProjectNavSliding
  ? 0
  : Math.max(0, workDetailsAppearDelayMs - 220)
  const visibleWorkImages = useMemo(() => getWorkDetailImages(visibleWork), [visibleWork])
  const visibleWorkGalleryImages = useMemo(() => {
    if (visibleWorkImages.length <= 1) {
      return []
    }
    
    return visibleWorkImages.slice(1)
  }, [visibleWorkImages])
  const visibleWorkCoverImage = visibleWorkImages[0] ?? null
  const isWorkPageCoverVisible =
  isWorkShowVisible &&
  !isReturningToIndex &&
  visibleWork !== null &&
  typeof visibleWorkCoverImage === 'string' &&
  visibleWorkCoverImage.length > 0
  const isWorkTransitionTargetPage =
  workTransitionSnapshot !== null &&
  getWorkSlugFromPath(workTransitionSnapshot.targetPath) !== null
  const isWorkPageCoverPreloading =
  isWorkTransitionTargetPage ||
  isProjectNavSliding
  const isWorkGalleryTransitionActive =
  workGalleryMorph !== null &&
  (workGalleryMorph.direction === 'next' || workGalleryMorph.direction === 'prev')
  const isProjectNavLocked =
  isWorkTitleClosing ||
  isProjectNavSliding ||
  isWorkGalleryTransitionActive ||
  isWorkThumbsSwitching
  const isWorkGalleryTransitionSource =
  isWorkGalleryTransitionActive &&
  workGalleryMorph?.fromSlug !== null &&
  visibleWorkSlug === workGalleryMorph.fromSlug
  const isWorkGalleryTransitionTarget =
  isWorkGalleryTransitionActive &&
  workGalleryMorph?.toSlug !== null &&
  visibleWorkSlug === workGalleryMorph.toSlug
  const visibleWorkTitle = useMemo(() => {
    if (!visibleWork) {
      return null
    }

    const lines = getWorkTitleLines(visibleWork).map((line) => line.toUpperCase())
    const label = lines.join(' ').replace(/\s+/g, ' ').trim()
    
    const rows = lines.map((line, rowIndex) => {
      const rowChars = Array.from(line)
      if (rowChars.length === 0) {
        rowChars.push(' ')
      }
      
      return rowChars.map((character, charIndex) => {
        const isSpace = character === ' '
        const revealDelay = isSpace ? 0 : Math.round(Math.random() * TITLE_REVEAL_MAX_DELAY_MS)
        const revealDuration =
        isSpace
        ? 0
        : TITLE_REVEAL_MIN_DURATION_MS + Math.round(Math.random() * TITLE_REVEAL_DURATION_RANGE_MS)
        return {
          key: `${visibleWorkSlug ?? visibleWork.slug}-${rowIndex}-${charIndex}`,
          character,
          isSpace,
          isDot: character === '.',
          style: isSpace
          ? undefined
          : {
            '--title-reveal-delay': `${revealDelay}ms`,
            '--title-reveal-duration': `${revealDuration}ms`,
          },
        }
      })
    })
    
    return {
      label,
      rows,
    }
  }, [visibleWorkSlug, visibleWork])
  const visibleWorkOrderLabel = visibleWork && visibleWorkIndex >= 0 ? getWorkOrderLabel(visibleWorkIndex) : ''
  const workShowKickerState = workShowKickerTransition
  ? {
    currentLabel: workShowKickerTransition.fromLabel,
    nextLabel: workShowKickerTransition.toLabel,
    direction: workShowKickerTransition.direction,
  }
  : visibleWorkOrderLabel
  ? {
    currentLabel: visibleWorkOrderLabel,
    nextLabel: visibleWorkOrderLabel,
    direction: null,
  }
  : null
  const visibleWorkMeta = useMemo(() => {
    if (!visibleWork) {
      return []
    }

    return WORK_META_COLUMNS.map((column) => {
      const value = column.getValue(visibleWork)
      const href = typeof column.getHref === 'function' ? column.getHref(visibleWork) : null
      
      return {
        key: column.key,
        gridColumn: column.gridColumn,
        value,
        href,
      }
    }).filter((item) => typeof item.value === 'string' && item.value.trim().length > 0)
  }, [visibleWork])
  const workThumbSliderStyle = useMemo(() => {
    if (!workThumbSliderRect) {
      return undefined
    }
    
    return {
      transform: `translate(${workThumbSliderRect.x}px, ${workThumbSliderRect.y}px)`,
      width: `${workThumbSliderRect.width}px`,
      height: `${workThumbSliderRect.height}px`,
      opacity: 1,
    }
  }, [workThumbSliderRect])
  const workProjectNavThumbsStyle = useMemo(() => {
    const exitDurationMs = Math.max(
      360,
      WORK_PAGE_COVER_SLIDE_DURATION_MS - WORK_THUMB_EXIT_SWAP_BUFFER_MS,
    )

    return {
      '--work-thumb-exit-duration': `${exitDurationMs}ms`,
      '--work-thumb-enter-duration': `${WORK_THUMB_ENTER_DURATION_MS}ms`,
    }
  }, [])
  const currentYear = new Date().getFullYear()
  const targetPath = isAboutPage ? aboutReturnPath ?? '/' : '/about'
  const activePreloaderFrameSvg = totalPreloaderFrames > 0
    ? preloaderFrameSvgs[Math.min(preloaderFrameIndex, totalPreloaderFrames - 1)] ?? ''
    : ''
  const activeLogoFrame = useMemo(() => {
    if (totalFrames === 0) {
      return null
    }
    
    const currentFrameUrl = logoFrameUrls[frameIndex]
    const currentFrameSvg = logoFrameSvgs[frameIndex] ?? ''
    if (loadedLogoFrames.has(currentFrameUrl)) {
      return {
        url: currentFrameUrl,
        svg: currentFrameSvg,
      }
    }
    
    const fallbackFrameIndex = logoFrameUrls.findIndex((frameUrl) => loadedLogoFrames.has(frameUrl))
    const resolvedFrameIndex = fallbackFrameIndex >= 0 ? fallbackFrameIndex : frameIndex

    return {
      url: logoFrameUrls[resolvedFrameIndex],
      svg: logoFrameSvgs[resolvedFrameIndex] ?? currentFrameSvg,
    }
  }, [frameIndex, loadedLogoFrames, totalFrames])
  
  useEffect(() => {
    if (isAboutPage) {
      document.title = 'crxtianhub — About'
      return
    }

    if (activeWork) {
      document.title = `crxtianhub — ${activeWork.title}`
      return
    }

    document.title = DEFAULT_DOCUMENT_TITLE
  }, [activeWork, isAboutPage])

  useEffect(() => {
    if (!isPreloaderActive || totalPreloaderFrames === 0) {
      return undefined
    }

    const totalDurationMs = totalPreloaderFrames * PRELOADER_FRAME_INTERVAL_MS
    const startedAt = window.performance.now()

    const updatePreloader = (timestamp) => {
      const elapsedMs = Math.max(0, timestamp - startedAt)
      const progress = Math.min(elapsedMs / totalDurationMs, 1)
      const nextFrameIndex = Math.min(
        Math.floor(elapsedMs / PRELOADER_FRAME_INTERVAL_MS),
        totalPreloaderFrames - 1,
      )

      setPreloaderFrameIndex(nextFrameIndex)
      setPreloaderCounter(Math.floor(progress * 100))

      if (progress < 1) {
        preloaderAnimationFrameRef.current = window.requestAnimationFrame(updatePreloader)
      }
    }

    preloaderAnimationFrameRef.current = window.requestAnimationFrame(updatePreloader)
    preloaderCompleteTimeoutRef.current = window.setTimeout(() => {
      preloaderCompleteTimeoutRef.current = null
      setPreloaderFrameIndex(totalPreloaderFrames - 1)
      setPreloaderCounter(100)
      setIsPreloaderExiting(true)

      if (
        route === '/' &&
        typeof window !== 'undefined' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setIsIndexIntroActive(true)
      }

      preloaderExitTimeoutRef.current = window.setTimeout(() => {
        preloaderExitTimeoutRef.current = null
        setIsPreloaderActive(false)
      }, PRELOADER_EXIT_DURATION_MS)
    }, totalDurationMs)

    return () => {
      if (preloaderAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(preloaderAnimationFrameRef.current)
        preloaderAnimationFrameRef.current = null
      }

      if (preloaderCompleteTimeoutRef.current !== null) {
        window.clearTimeout(preloaderCompleteTimeoutRef.current)
        preloaderCompleteTimeoutRef.current = null
      }

      if (preloaderExitTimeoutRef.current !== null) {
        window.clearTimeout(preloaderExitTimeoutRef.current)
        preloaderExitTimeoutRef.current = null
      }

    }
  }, [isPreloaderActive, route, totalPreloaderFrames])

  useEffect(() => {
    if (totalFrames === 0) {
      return undefined
    }
    
    loadedLogoFramesRef.current = new Set()
    
    let isCancelled = false
    
    const markFrameAsLoaded = (frameUrl) => {
      if (isCancelled || loadedLogoFramesRef.current.has(frameUrl)) {
        return
      }
      
      const nextLoadedFrames = new Set(loadedLogoFramesRef.current)
      nextLoadedFrames.add(frameUrl)
      loadedLogoFramesRef.current = nextLoadedFrames
      setLoadedLogoFrames(nextLoadedFrames)
    }
    
    logoFrameUrls.forEach((frameUrl) => {
      const frameImage = new window.Image()
      frameImage.decoding = 'async'
      frameImage.src = frameUrl
      
      const onFrameReady = () => {
        markFrameAsLoaded(frameUrl)
      }
      
      frameImage.addEventListener('load', onFrameReady, { once: true })
      frameImage.addEventListener('error', onFrameReady, { once: true })
      
      if (frameImage.complete) {
        markFrameAsLoaded(frameUrl)
      }
    })
    
    return () => {
      isCancelled = true
    }
  }, [totalFrames])
  
  useEffect(() => {
    if (totalFrames <= 1 || isLogoHovered) {
      return undefined
    }
    
    const logoFrameIntervalMs = isLogoRainbowBoost
    ? LOGO_TRANSITION_FRAME_INTERVAL_MS
    : LOGO_BASE_FRAME_INTERVAL_MS
    
    const loopId = window.setInterval(() => {
      setFrameIndex((prev) => {
        const nextIndex = (prev + 1) % totalFrames
        const nextFrameUrl = logoFrameUrls[nextIndex]
        
        if (!loadedLogoFramesRef.current.has(nextFrameUrl)) {
          return prev
        }
        
        return nextIndex
      })
    }, logoFrameIntervalMs)
    
    return () => {
      window.clearInterval(loopId)
    }
  }, [isLogoHovered, isLogoRainbowBoost, totalFrames])
  
  useEffect(() => {
    works.forEach((work) => {
      preloadImageUrl(getWorkPrimaryImageUrl(work))
    })
  }, [])

  useEffect(() => {
    if (!visibleWork) {
      return
    }

    preloadImageUrl(getWorkPrimaryImageUrl(visibleWork))

    if (previousWork) {
      preloadImageUrl(getWorkPrimaryImageUrl(previousWork))
    }

    if (nextWork) {
      preloadImageUrl(getWorkPrimaryImageUrl(nextWork))
    }
  }, [nextWork, previousWork, visibleWork])

  useEffect(() => {
    if (!isAboutPage || aboutHeartFrames.length === 0) {
      return undefined
    }

    const aboutHeartCount = aboutHeartFrames.length
    const currentFrameDurationMs =
    aboutHeartFrameDurationsMs[activeAboutHeartIndex % aboutHeartCount] ?? 720
    const timeoutId = window.setTimeout(() => {
      setActiveAboutHeartIndex((currentIndex) => (currentIndex + 1) % aboutHeartCount)
    }, currentFrameDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeAboutHeartIndex, isAboutPage])

  useEffect(() => {
    if (!isDesignerLogoCursorActive) {
      document.body.classList.remove('is-designer-logo-cursor-active')
      return undefined
    }

    document.body.classList.add('is-designer-logo-cursor-active')

    const updateCursorFromWindow = (event) => {
      setDesignerLogoCursorPosition({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('pointermove', updateCursorFromWindow, { passive: true })

    return () => {
      window.removeEventListener('pointermove', updateCursorFromWindow)
      document.body.classList.remove('is-designer-logo-cursor-active')
    }
  }, [isDesignerLogoCursorActive])

  useEffect(() => () => {
    if (designerLogoCursorTimeoutRef.current !== null) {
      window.clearTimeout(designerLogoCursorTimeoutRef.current)
      designerLogoCursorTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isAboutPage) {
      setIsFreakHovered(false)
      return undefined
    }

    const { body, documentElement } = document
    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = documentElement.style.overflow
    const previousOverscrollBehavior = documentElement.style.overscrollBehavior

    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    documentElement.style.overscrollBehavior = 'none'

    return () => {
      body.style.overflow = previousBodyOverflow
      documentElement.style.overflow = previousHtmlOverflow
      documentElement.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [isAboutPage])

  useEffect(() => {
    if (!isAboutPage) {
      return undefined
    }

    const closeFreakOnOutsidePointerDown = (event) => {
      const freakNode = freakRef.current
      if (freakNode instanceof HTMLElement && event.target instanceof Node && freakNode.contains(event.target)) {
        return
      }

      setIsFreakHovered(false)
    }

    window.addEventListener('pointerdown', closeFreakOnOutsidePointerDown, true)

    return () => {
      window.removeEventListener('pointerdown', closeFreakOnOutsidePointerDown, true)
    }
  }, [isAboutPage])
  
  useEffect(() => {
    const onPopState = () => {
      const nextRoute = normalizePath(window.location.pathname)
      const historyState = window.history.state
      const rawReturnPath = historyState?.aboutReturnPath
      const nextAboutReturnPath =
        typeof rawReturnPath === 'string' && rawReturnPath.trim().length > 0
          ? normalizePath(rawReturnPath)
          : null

      projectNavRequestIdRef.current += 1
      setIsWorkTitleClosing(false)
      setIsWorkTitleExitComplete(false)
      setReturningKickerSlug(null)
      setIsProjectNavIndexEntry(route === '/' && getWorkSlugFromPath(nextRoute) !== null)
      setWorkProjectNavDirection(null)
      setWorkPageCoverSlide(null)
      setLockedWorkSlug(null)
      setIsProjectNavContentReveal(false)
      setIsProjectNavHandoffSettling(false)
      setWorkGalleryMorph(null)
      setIsWorkThumbsEntering(false)
      setAboutReturnPath(nextAboutReturnPath)
      if (nextRoute === '/about') {
        setActiveAboutHeartIndex(0)
      }
      if (projectNavRouteTimeoutRef.current !== null) {
        window.clearTimeout(projectNavRouteTimeoutRef.current)
        projectNavRouteTimeoutRef.current = null
      }
      if (workThumbsRevealTimeoutRef.current !== null) {
        window.clearTimeout(workThumbsRevealTimeoutRef.current)
        workThumbsRevealTimeoutRef.current = null
      }
      pendingWorkThumbsRouteRef.current = null
      setIsWorkThumbsSwitching(false)
      setRoute(nextRoute)
    }
    
  window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [route])
  
  useEffect(() => {
    if (!isWorkThumbsEntering) {
      if (workThumbsRevealTimeoutRef.current !== null) {
        window.clearTimeout(workThumbsRevealTimeoutRef.current)
        workThumbsRevealTimeoutRef.current = null
      }
      return undefined
    }

    if (workThumbsRevealTimeoutRef.current !== null) {
      window.clearTimeout(workThumbsRevealTimeoutRef.current)
      workThumbsRevealTimeoutRef.current = null
    }

    workThumbsRevealTimeoutRef.current = window.setTimeout(() => {
      workThumbsRevealTimeoutRef.current = null
      setIsWorkThumbsEntering(false)
    }, WORK_THUMB_ENTER_DURATION_MS)

    return () => {
      if (workThumbsRevealTimeoutRef.current !== null) {
        window.clearTimeout(workThumbsRevealTimeoutRef.current)
        workThumbsRevealTimeoutRef.current = null
      }
    }
  }, [isWorkThumbsEntering])
  
  useEffect(() => {
    return () => {
      if (logoBoostTimeoutRef.current !== null) {
        window.clearTimeout(logoBoostTimeoutRef.current)
      }
      
      if (workTitleExitTimeoutRef.current !== null) {
        window.clearTimeout(workTitleExitTimeoutRef.current)
      }

      if (workTitleExitCompleteTimeoutRef.current !== null) {
        window.clearTimeout(workTitleExitCompleteTimeoutRef.current)
      }

      if (returnToIndexTimeoutRef.current !== null) {
        window.clearTimeout(returnToIndexTimeoutRef.current)
      }
      
      if (indexKickerExitTimeoutRef.current !== null) {
        window.clearTimeout(indexKickerExitTimeoutRef.current)
      }

      if (indexIntroTimeoutRef.current !== null) {
        window.clearTimeout(indexIntroTimeoutRef.current)
      }

      if (preloaderAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(preloaderAnimationFrameRef.current)
      }

      if (preloaderCompleteTimeoutRef.current !== null) {
        window.clearTimeout(preloaderCompleteTimeoutRef.current)
      }

      if (preloaderExitTimeoutRef.current !== null) {
        window.clearTimeout(preloaderExitTimeoutRef.current)
      }

      if (workThumbsRevealTimeoutRef.current !== null) {
        window.clearTimeout(workThumbsRevealTimeoutRef.current)
      }

      if (workGalleryMorphTimeoutRef.current !== null) {
        window.clearTimeout(workGalleryMorphTimeoutRef.current)
      }

      if (projectNavScrollSettleTimeoutRef.current !== null) {
        window.clearTimeout(projectNavScrollSettleTimeoutRef.current)
      }
      
      if (projectNavRouteTimeoutRef.current !== null) {
        window.clearTimeout(projectNavRouteTimeoutRef.current)
      }

      if (projectNavHandoffTimeoutRef.current !== null) {
        window.clearTimeout(projectNavHandoffTimeoutRef.current)
      }
    }
  }, [])
  
  useEffect(() => {
    workGalleryMorphRef.current = workGalleryMorph
  }, [workGalleryMorph])

  useEffect(() => {
    if (!isWorkTitleClosing) {
      workTitleClosingStartedAtRef.current = null

      if (workTitleExitCompleteTimeoutRef.current !== null) {
        window.clearTimeout(workTitleExitCompleteTimeoutRef.current)
        workTitleExitCompleteTimeoutRef.current = null
      }
    }
  }, [isWorkTitleClosing])

  useEffect(() => {
    if (!workPageCoverSlide) {
      return undefined
    }
    
    let hasFinished = false
    let handoffFrameId = null
    let cleanupFrameId = null
    const finishProjectNavSlide = () => {
      if (hasFinished) {
        return
      }
      
      hasFinished = true
      setLockedWorkSlug(null)
      setIsWorkThumbsSwitching(false)
      setIsWorkThumbsEntering(true)
      setIsWorkTitleClosing(false)
      setIsWorkTitleExitComplete(false)
      setIsProjectNavScrollSettling(true)
      setIsProjectNavHandoffSettling(true)
      pendingWorkThumbsRouteRef.current = null

      if (projectNavScrollSettleTimeoutRef.current !== null) {
        window.clearTimeout(projectNavScrollSettleTimeoutRef.current)
        projectNavScrollSettleTimeoutRef.current = null
      }

      projectNavScrollSettleTimeoutRef.current = window.setTimeout(() => {
        projectNavScrollSettleTimeoutRef.current = null
        setIsProjectNavScrollSettling(false)
      }, WORK_PROJECT_NAV_SCROLL_SETTLE_MS)

      if (workGalleryMorphTimeoutRef.current !== null) {
        window.clearTimeout(workGalleryMorphTimeoutRef.current)
        workGalleryMorphTimeoutRef.current = null
      }

      const currentWorkGalleryMorph = workGalleryMorphRef.current

      if (currentWorkGalleryMorph) {
        const galleryItemCount = Math.max(
          currentWorkGalleryMorph.fromImages.length,
          currentWorkGalleryMorph.toImages.length,
        )
        const gallerySettleDelayMs =
          WORK_GALLERY_NAV_ENTER_DURATION_MS +
          Math.max(0, galleryItemCount - 1) * WORK_GALLERY_MORPH_STAGGER_MS +
          160

        workGalleryMorphTimeoutRef.current = window.setTimeout(() => {
          workGalleryMorphTimeoutRef.current = null
          setWorkGalleryMorph(null)
        }, gallerySettleDelayMs)
      } else {
        setWorkGalleryMorph(null)
      }

      handoffFrameId = window.requestAnimationFrame(() => {
        cleanupFrameId = window.requestAnimationFrame(() => {
          setWorkPageCoverSlide(null)
          if (projectNavHandoffTimeoutRef.current !== null) {
            window.clearTimeout(projectNavHandoffTimeoutRef.current)
          }
          projectNavHandoffTimeoutRef.current = window.setTimeout(() => {
            projectNavHandoffTimeoutRef.current = null
            setIsProjectNavHandoffSettling(false)
          }, 120)
        })
      })
    }
    
    const enteringNode = workCoverRefs.current.get(workPageCoverSlide.toSlug)
    const onAnimationEnd = (event) => {
      if (event.target !== enteringNode) {
        return
      }
      
      if (
        event.animationName !== 'work-cover-nav-enter-next' &&
        event.animationName !== 'work-cover-nav-enter-prev'
      ) {
        return
      }
      
      finishProjectNavSlide()
    }
    
    if (enteringNode instanceof HTMLElement) {
      enteringNode.addEventListener('animationend', onAnimationEnd)
    }
    
    const timeoutId = window.setTimeout(finishProjectNavSlide, WORK_PAGE_COVER_SLIDE_DURATION_MS + 180)
    
    return () => {
      if (enteringNode instanceof HTMLElement) {
        enteringNode.removeEventListener('animationend', onAnimationEnd)
      }
      if (!hasFinished && handoffFrameId !== null) {
        window.cancelAnimationFrame(handoffFrameId)
      }
      if (!hasFinished && cleanupFrameId !== null) {
        window.cancelAnimationFrame(cleanupFrameId)
      }
      window.clearTimeout(timeoutId)
    }
  }, [workPageCoverSlide])
  
  useEffect(() => {
    if (!isProjectNavContentReveal || workPageCoverSlide || lockedWorkSlug !== null) {
      return undefined
    }
    
    const frameId = window.requestAnimationFrame(() => {
      setIsProjectNavContentReveal(false)
    })
    
    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isProjectNavContentReveal, workPageCoverSlide, lockedWorkSlug])
  
  useEffect(() => {
    if (!isWorkMetaEntering || !isWorkPage || isWorkTitleClosing) {
      return undefined
    }
    
    let secondFrameId = null
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsWorkMetaEntering(false)
      })
    })
    
    return () => {
      window.cancelAnimationFrame(firstFrameId)
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId)
      }
    }
  }, [isWorkMetaEntering, isWorkPage, isWorkTitleClosing])

  useEffect(() => {
    if (!isIndexIntroActive) {
      return undefined
    }

    if (route !== '/') {
      const frameId = window.requestAnimationFrame(() => {
        setIsIndexIntroActive(false)
      })

      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    indexIntroTimeoutRef.current = window.setTimeout(() => {
      indexIntroTimeoutRef.current = null
      setIsIndexIntroActive(false)
    }, INDEX_INTRO_DURATION_MS)

    return () => {
      if (indexIntroTimeoutRef.current !== null) {
        window.clearTimeout(indexIntroTimeoutRef.current)
        indexIntroTimeoutRef.current = null
      }
    }
  }, [isIndexIntroActive, route])

  useEffect(() => {
    if (isWorkPage || isReturningToIndex) {
      return
    }
    
    projectNavRequestIdRef.current += 1
    
    const resetFrameId = window.requestAnimationFrame(() => {
      setWorkPageCoverSlide(null)
      setLockedWorkSlug(null)
      setIsProjectNavContentReveal(false)
      setIsProjectNavHandoffSettling(false)
      setWorkGalleryMorph(null)
      setIsWorkTitleExitComplete(false)
      setIsWorkMetaEntering(false)
      setReturningKickerSlug(null)
    })
    const thumbsResetFrameId = window.requestAnimationFrame(() => {
      setIsWorkThumbsSwitching(false)
      setIsWorkThumbsEntering(false)
    })
    
    if (indexKickerExitTimeoutRef.current !== null) {
      window.clearTimeout(indexKickerExitTimeoutRef.current)
      indexKickerExitTimeoutRef.current = null
    }
    
    if (workTitleExitTimeoutRef.current !== null) {
      window.clearTimeout(workTitleExitTimeoutRef.current)
      workTitleExitTimeoutRef.current = null
    }
    
      if (workThumbsRevealTimeoutRef.current !== null) {
        window.clearTimeout(workThumbsRevealTimeoutRef.current)
        workThumbsRevealTimeoutRef.current = null
      }

      if (workGalleryMorphTimeoutRef.current !== null) {
        window.clearTimeout(workGalleryMorphTimeoutRef.current)
        workGalleryMorphTimeoutRef.current = null
      }
    
    pendingWorkThumbsRouteRef.current = null
    
    return () => {
      window.cancelAnimationFrame(resetFrameId)
      window.cancelAnimationFrame(thumbsResetFrameId)
    }
  }, [isWorkPage, isReturningToIndex])
  
  useEffect(() => {
    if (route !== '/') {
      return
    }
    
    workCoverRefs.current.forEach((node) => {
      clearWorkKickerClasses(node)
    })
  }, [route])
  
  useEffect(() => {
    const pageStageNode = pageStageRef.current
    const workShowPageNode = workShowPageRef.current
    let animationFrameId = null
    
    if (!(pageStageNode instanceof HTMLElement)) {
      return undefined
    }
    
    if (!isWorkPage || !(workShowPageNode instanceof HTMLElement)) {
      pageStageNode.style.setProperty('--work-show-scroll-y', '0px')
      return undefined
    }
    
    const resetScrollTop = (remainingFrames = WORK_SHOW_ROUTE_SCROLL_RESET_FRAMES) => {
      workShowPageNode.scrollTop = 0
      pageStageNode.style.setProperty('--work-show-scroll-y', '0px')

      if (remainingFrames <= 0) {
        animationFrameId = null
        return
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        resetScrollTop(remainingFrames - 1)
      })
    }

    resetScrollTop()
    
    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
      pageStageNode.style.setProperty('--work-show-scroll-y', '0px')
    }
  }, [isWorkPage, visibleWorkSlug])
  
  useEffect(() => {
    if (!workShowKickerTransition) {
      return undefined
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setWorkShowKickerIsAnimating(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [workShowKickerTransition])

  useEffect(() => {
    if (!workShowKickerTransition || workPageCoverSlide !== null || lockedWorkSlug !== null) {
      return undefined
    }

    const clearFrameId = window.requestAnimationFrame(() => {
      setWorkShowKickerTransition(null)
    })

    return () => {
      window.cancelAnimationFrame(clearFrameId)
    }
  }, [lockedWorkSlug, workPageCoverSlide, workShowKickerTransition])

  useEffect(() => {
    const workShowPageNode = workShowPageRef.current

    if (!isWorkPage || !isProjectNavLocked || !(workShowPageNode instanceof HTMLElement)) {
      return undefined
    }

    let animationFrameId = null

    const clampScrollToRealPageEnd = () => {
      animationFrameId = null
      const maxScrollTop = getWorkShowPageRealMaxScrollTop(workShowPageNode)

      if (workShowPageNode.scrollTop > maxScrollTop) {
        workShowPageNode.scrollTop = maxScrollTop
      }
    }

    const requestClamp = () => {
      if (animationFrameId !== null) {
        return
      }

      animationFrameId = window.requestAnimationFrame(clampScrollToRealPageEnd)
    }

    requestClamp()
    workShowPageNode.addEventListener('scroll', requestClamp, { passive: true })
    window.addEventListener('resize', requestClamp)

    return () => {
      workShowPageNode.removeEventListener('scroll', requestClamp)
      window.removeEventListener('resize', requestClamp)

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isWorkPage, isProjectNavLocked, visibleWorkSlug, visibleWorkGalleryImages.length])
  
  useEffect(() => {
    const workShowPageNode = workShowPageRef.current
    const thumbsContainerNode = workThumbsRef.current
    
    if (
      !isWorkPage ||
      !(workShowPageNode instanceof HTMLElement) ||
      !(thumbsContainerNode instanceof HTMLElement) ||
      visibleWorkImages.length === 0
    ) {
      const resetFrameId = window.requestAnimationFrame(() => {
        setWorkThumbSliderRect(null)
      })
      
      return () => {
        window.cancelAnimationFrame(resetFrameId)
      }
    }
    
    let animationFrameId = null
    
    const syncThumbSliderByScroll = () => {
      animationFrameId = null
      const firstThumbNode = workThumbRefs.current.get(0)
      const lastThumbNode = workThumbRefs.current.get(visibleWorkImages.length - 1)
      
      if (!(firstThumbNode instanceof HTMLElement) || !(lastThumbNode instanceof HTMLElement)) {
        setWorkThumbSliderRect(null)
        return
      }
      
      const containerRect = thumbsContainerNode.getBoundingClientRect()
      const firstThumbRect = firstThumbNode.getBoundingClientRect()
      const lastThumbRect = lastThumbNode.getBoundingClientRect()
      const maxScrollTop = getWorkShowPageRealMaxScrollTop(workShowPageNode)
      const scrollProgress =
      maxScrollTop <= 0 ? 0 : Math.min(1, Math.max(0, workShowPageNode.scrollTop / maxScrollTop))
      const startY = firstThumbRect.top - containerRect.top - WORK_THUMB_SLIDER_EXTRA_Y
      const endY = lastThumbRect.top - containerRect.top - WORK_THUMB_SLIDER_EXTRA_Y
      
      setWorkThumbSliderRect({
        x: firstThumbRect.left - containerRect.left - WORK_THUMB_SLIDER_EXTRA_X,
        y: startY + (endY - startY) * scrollProgress,
        width: firstThumbRect.width + WORK_THUMB_SLIDER_EXTRA_X * 2,
        height: firstThumbRect.height + WORK_THUMB_SLIDER_EXTRA_Y * 2,
      })
    }
    
    const requestThumbSliderSync = () => {
      if (animationFrameId !== null) {
        return
      }
      
      animationFrameId = window.requestAnimationFrame(syncThumbSliderByScroll)
    }
    
    requestThumbSliderSync()
    workShowPageNode.addEventListener('scroll', requestThumbSliderSync, { passive: true })
    window.addEventListener('resize', requestThumbSliderSync)
    
    return () => {
      workShowPageNode.removeEventListener('scroll', requestThumbSliderSync)
      window.removeEventListener('resize', requestThumbSliderSync)
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isWorkPage, visibleWorkSlug, visibleWorkImages.length, workMetrics])
  
  useLayoutEffect(() => {
    const previousRoute = previousRouteRef.current
    const previousWorkSlug = getWorkSlugFromPath(previousRoute)
    const isReturningFromWorkToIndex = previousWorkSlug !== null && route === '/'
    
    if (isReturningFromWorkToIndex) {
      const sourceIndex = works.findIndex((work) => work.slug === previousWorkSlug)
      const previousWork = works.find((work) => work.slug === previousWorkSlug) ?? null
      const galleryItemCount = Math.max(0, getWorkDetailImages(previousWork).length - 1)
      const maxOrderDistance =
      sourceIndex >= 0 ? Math.max(sourceIndex, works.length - 1 - sourceIndex) : Math.max(0, works.length - 1)
      const clearDelayMs =
      Math.max(
        WORK_FLIP_DURATION_MS + maxOrderDistance * WORK_RETURN_STAGGER_MS,
        WORK_GALLERY_RETURN_DURATION_MS +
          Math.max(0, galleryItemCount - 1) *
            WORK_GALLERY_ITEM_STAGGER_MS *
            WORK_GALLERY_RETURN_STAGGER_RATIO,
      ) + WORK_RETURN_RESET_BUFFER_MS
      
      setReturningSourceSlug(previousWorkSlug)
      setIsReturningToIndex(true)
      
      if (returnToIndexTimeoutRef.current !== null) {
        window.clearTimeout(returnToIndexTimeoutRef.current)
      }
      
      returnToIndexTimeoutRef.current = window.setTimeout(() => {
        returnToIndexTimeoutRef.current = null
        setIsReturningToIndex(false)
        setReturningSourceSlug(null)
        setIsWorkTitleClosing(false)
        setIsWorkTitleExitComplete(false)
        setReturningKickerSlug(null)
      }, clearDelayMs)
    } else if (route !== '/') {
      if (returnToIndexTimeoutRef.current !== null) {
        window.clearTimeout(returnToIndexTimeoutRef.current)
        returnToIndexTimeoutRef.current = null
      }
      
      if (isReturningToIndex) {
        setIsReturningToIndex(false)
        setIsWorkTitleClosing(false)
        setIsWorkTitleExitComplete(false)
        setReturningKickerSlug(null)
      }
      
      if (returningSourceSlug !== null) {
        setReturningSourceSlug(null)
      }
    }
    
    previousRouteRef.current = route
  }, [route, isReturningToIndex, returningSourceSlug])
  
  useEffect(() => {
    const updateMetrics = () => {
      setWorkMetrics(getWorkMetrics(worksStripRef.current))
    }
    
    updateMetrics()
    
    const onResize = () => {
      updateMetrics()
    }
    
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [route])
  
  useLayoutEffect(() => {
    if (!workTransitionSnapshot) {
      return undefined
    }
    
    if (route !== workTransitionSnapshot.targetPath) {
      return undefined
    }
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const clearSnapshotFrameId = window.requestAnimationFrame(() => {
        setWorkTransitionSnapshot(null)
      })
      
      return () => {
        window.cancelAnimationFrame(clearSnapshotFrameId)
      }
    }
    
    const isTargetWorkPage = getWorkSlugFromPath(workTransitionSnapshot.targetPath) !== null
    const isIndexToWorkTransition = isTargetWorkPage && workTransitionSnapshot.sourcePath === '/'
    const isWorkToIndexTransition =
    workTransitionSnapshot.targetPath === '/' && getWorkSlugFromPath(workTransitionSnapshot.sourcePath) !== null
    const targetWorkNode = workCoverRefs.current.get(workTransitionSnapshot.slug)
    if (!targetWorkNode) {
      return undefined
    }

    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches
    const workShowCoverNode = isIndexToWorkTransition && !isMobileViewport
    ? document.querySelector('.work-show-cover')
    : null
    const targetRect =
    workShowCoverNode instanceof HTMLElement
    ? workShowCoverNode.getBoundingClientRect()
    : targetWorkNode.getBoundingClientRect()

    if (targetRect.width <= 0 || targetRect.height <= 0) {
      return undefined
    }
    
    const deltaX = workTransitionSnapshot.left - targetRect.left
    const deltaY = workTransitionSnapshot.top - targetRect.top
    const initialWidth = workTransitionSnapshot.width
    const initialHeight = workTransitionSnapshot.height
    const finalWidth = targetRect.width
    const finalHeight = targetRect.height
    const duration = isMobileViewport ? MOBILE_WORK_FLIP_DURATION_MS : WORK_FLIP_DURATION_MS
    const kickerColorDuration = Math.round(duration * 0.2)
    const kickerMoveDelay = Math.round(duration * 0.06)
    const rootStyles = window.getComputedStyle(document.documentElement)
    const projectWhite = rootStyles.getPropertyValue('--project-white').trim() || '#F0F0EF'
    const projectBlack = rootStyles.getPropertyValue('--project-black').trim() || '#282828'
    const shouldSlotKicker = false
    const shouldAnimateKickerGhost =
    ENABLE_INDEX_KICKER_ANIMATION && !isIndexToWorkTransition && !isWorkToIndexTransition
    const sourceKicker = workTransitionSnapshot.kicker
    const targetKickerNode = targetWorkNode.querySelector('.work-cover-kicker')
    
    let kickerGhostNode = null
    let targetKickerLeft = 0
    let targetKickerTop = 0
    let targetKickerColor = isTargetWorkPage ? projectWhite : projectBlack
    
    if (shouldAnimateKickerGhost && sourceKicker && targetKickerNode instanceof HTMLElement) {
      const targetKickerRect = targetKickerNode.getBoundingClientRect()
      if (targetKickerRect.width > 0 && targetKickerRect.height > 0) {
        targetKickerLeft = targetKickerRect.left
        targetKickerTop = targetKickerRect.top
        
        const ghostNode = document.createElement('span')
        ghostNode.className = 'work-cover-kicker-ghost'
        ghostNode.textContent = sourceKicker.text
        ghostNode.style.position = 'fixed'
        ghostNode.style.left = `${sourceKicker.left}px`
        ghostNode.style.top = `${sourceKicker.top}px`
        ghostNode.style.margin = '0'
        ghostNode.style.padding = '0'
        ghostNode.style.transform = 'none'
        ghostNode.style.fontFamily = sourceKicker.fontFamily
        ghostNode.style.fontSize = sourceKicker.fontSize
        ghostNode.style.fontWeight = sourceKicker.fontWeight
        ghostNode.style.lineHeight = sourceKicker.lineHeight
        ghostNode.style.letterSpacing = sourceKicker.letterSpacing
        ghostNode.style.whiteSpace = 'nowrap'
        ghostNode.style.color = sourceKicker.color
        ghostNode.style.pointerEvents = 'none'
        ghostNode.style.zIndex = '9900'
        ghostNode.style.transition = 'none'
        document.body.appendChild(ghostNode)
        kickerGhostNode = ghostNode
        targetWorkNode.classList.add('is-kicker-flipping')
      }
    }
    
    targetWorkNode.classList.add('is-flipping')
    if (isIndexToWorkTransition) {
      targetWorkNode.style.setProperty('position', 'fixed')
      targetWorkNode.style.setProperty('left', `${targetRect.left}px`)
      targetWorkNode.style.setProperty('top', `${targetRect.top}px`)
      targetWorkNode.style.setProperty('z-index', '9900')
    }
    targetWorkNode.style.setProperty('transform-origin', 'top left')
    targetWorkNode.style.setProperty('transition', 'none')
    targetWorkNode.style.setProperty('will-change', 'translate, width, height')
    targetWorkNode.style.setProperty('translate', `${deltaX}px ${deltaY}px`)
    targetWorkNode.style.setProperty('width', `${initialWidth}px`)
    targetWorkNode.style.setProperty('height', `${initialHeight}px`)
    targetWorkNode.getBoundingClientRect()
    
    let hasFinished = false
    let handoffFrameId = null
    let cleanupFrameId = null
    let kickerReturnFrameId = null
    let kickerReturnTimeoutId = null
    const finishTransition = () => {
      if (hasFinished) {
        return
      }
      
      hasFinished = true
      if (shouldSlotKicker) {
        targetWorkNode.classList.add('is-kicker-slotting')
      } else {
        targetWorkNode.classList.remove('is-kicker-slotting')
      }
      
      const clearTargetWorkNode = () => {
        targetWorkNode.classList.remove('is-flipping')
        targetWorkNode.classList.remove('is-kicker-flipping')
        targetWorkNode.classList.remove('is-kicker-exiting')
        clearWorkTransitionStyles(targetWorkNode)
      }

      if (kickerGhostNode) {
        kickerGhostNode.remove()
        kickerGhostNode = null
      }

      if (isIndexToWorkTransition) {
        setWorkTransitionSnapshot(null)
        handoffFrameId = window.requestAnimationFrame(() => {
          cleanupFrameId = window.requestAnimationFrame(() => {
            clearTargetWorkNode()
          })
        })
        return
      }
      
      clearTargetWorkNode()

      if (isWorkToIndexTransition) {
        targetWorkNode.classList.remove('is-kicker-slotting')
        targetWorkNode.classList.remove('is-kicker-return-prep')
        targetWorkNode.classList.add('is-kicker-returning')
        setReturningKickerSlug(workTransitionSnapshot.slug)
        kickerReturnTimeoutId = window.setTimeout(() => {
          kickerReturnTimeoutId = null
          targetWorkNode.classList.remove('is-kicker-returning')
          setReturningKickerSlug((currentSlug) =>
            currentSlug === workTransitionSnapshot.slug ? null : currentSlug,
          )
        }, INDEX_KICKER_RETURN_DURATION_MS + 120)
      } else {
        targetWorkNode.classList.remove('is-kicker-return-prep')
        targetWorkNode.classList.remove('is-kicker-returning')
        clearWorkKickerInlineAnimation(targetWorkNode)
      }

      setWorkTransitionSnapshot(null)
    }
    
    const onTransitionEnd = (event) => {
      if (event.target !== targetWorkNode) {
        return
      }
      
      if (
        event.propertyName !== 'translate' &&
        event.propertyName !== 'width' &&
        event.propertyName !== 'height'
      ) {
        return
      }
      
      targetWorkNode.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallbackTimeoutId)
      finishTransition()
    }
    
    const frameId = window.requestAnimationFrame(() => {
      targetWorkNode.style.setProperty(
        'transition',
        `translate ${duration}ms ${WORK_FLIP_EASING}, width ${duration}ms ${WORK_FLIP_EASING}, height ${duration}ms ${WORK_FLIP_EASING}`,
      )
      targetWorkNode.style.setProperty('translate', '0px 0px')
      targetWorkNode.style.setProperty('width', `${finalWidth}px`)
      targetWorkNode.style.setProperty('height', `${finalHeight}px`)
      
      if (kickerGhostNode) {
        kickerGhostNode.style.transition =
        `top ${duration}ms ${WORK_FLIP_EASING} ${kickerMoveDelay}ms, left ${duration}ms ${WORK_FLIP_EASING} ${kickerMoveDelay}ms, color ${kickerColorDuration}ms ease-out`
        kickerGhostNode.style.left = `${targetKickerLeft}px`
        kickerGhostNode.style.top = `${targetKickerTop}px`
        kickerGhostNode.style.color = targetKickerColor
      }
    })
    
    const fallbackTimeoutId = window.setTimeout(finishTransition, duration + 140)
    targetWorkNode.addEventListener('transitionend', onTransitionEnd)
    
    return () => {
      const shouldKeepIndexToWorkHandoff = hasFinished && isIndexToWorkTransition

      window.cancelAnimationFrame(frameId)
      if (!shouldKeepIndexToWorkHandoff && handoffFrameId !== null) {
        window.cancelAnimationFrame(handoffFrameId)
      }
      if (!shouldKeepIndexToWorkHandoff && cleanupFrameId !== null) {
        window.cancelAnimationFrame(cleanupFrameId)
      }
      if (!hasFinished && kickerReturnFrameId !== null) {
        window.cancelAnimationFrame(kickerReturnFrameId)
      }
      if (kickerReturnTimeoutId !== null && (!hasFinished || !isWorkToIndexTransition)) {
        window.clearTimeout(kickerReturnTimeoutId)
        kickerReturnTimeoutId = null
      }
      if (!hasFinished) {
        setReturningKickerSlug((currentSlug) =>
          currentSlug === workTransitionSnapshot.slug ? null : currentSlug,
        )
      }
      if (!hasFinished) {
        clearWorkKickerInlineAnimation(targetWorkNode)
      }
      window.clearTimeout(fallbackTimeoutId)
      targetWorkNode.removeEventListener('transitionend', onTransitionEnd)

      if (shouldKeepIndexToWorkHandoff) {
        return
      }

      targetWorkNode.classList.remove('is-flipping')
      targetWorkNode.classList.remove('is-kicker-flipping')
      targetWorkNode.classList.remove('is-kicker-exiting')
      targetWorkNode.classList.remove('is-kicker-return-prep')
      if (!hasFinished || !isWorkToIndexTransition) {
        targetWorkNode.classList.remove('is-kicker-returning')
      }
      if (!hasFinished || !shouldSlotKicker) {
        targetWorkNode.classList.remove('is-kicker-slotting')
      }
      
      if (kickerGhostNode) {
        kickerGhostNode.remove()
        kickerGhostNode = null
      }
      
      clearWorkTransitionStyles(targetWorkNode)
    }
  }, [route, workTransitionSnapshot])
  
  const navigate = (nextPath, options = {}) => {
    const normalized = normalizePath(nextPath)
    if (projectNavRouteTimeoutRef.current !== null) {
      window.clearTimeout(projectNavRouteTimeoutRef.current)
      projectNavRouteTimeoutRef.current = null
    }
    
    const requestedDirection =
    options.projectNavDirection === 'next' || options.projectNavDirection === 'prev'
    ? options.projectNavDirection
    : null
    const shouldSkipWorkCoverSlideAnimation = options.skipWorkCoverSlideAnimation === true
    const shouldPreserveWorkCoverSlide = options.preserveWorkCoverSlide === true
    const shouldPreserveWorkGalleryMorph = options.preserveWorkGalleryMorph === true
    const currentWorkSlug = getWorkSlugFromPath(route)
    const nextWorkSlug = getWorkSlugFromPath(normalized)
    const shouldAnimateWorkCoverSlide =
    !shouldSkipWorkCoverSlideAnimation &&
    requestedDirection !== null &&
    currentWorkSlug !== null &&
    nextWorkSlug !== null &&
    currentWorkSlug !== nextWorkSlug &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (normalized === route) {
      return
    }
    
    if (shouldAnimateWorkCoverSlide) {
      setIsProjectNavHandoffSettling(false)
      setWorkPageCoverSlide({
        fromSlug: currentWorkSlug,
        toSlug: nextWorkSlug,
        direction: requestedDirection,
      })
      if (shouldPreserveWorkGalleryMorph) {
        setLockedWorkSlug(null)
      }
    } else if (!shouldPreserveWorkCoverSlide) {
      setWorkPageCoverSlide(null)
      setIsProjectNavHandoffSettling(false)
    }
    
    if (!shouldPreserveWorkGalleryMorph) {
      setWorkGalleryMorph(null)
    }
    
    const isWorkToIndexNavigation = currentWorkSlug !== null && normalized === '/'

    if (isWorkToIndexNavigation) {
      setReturningSourceSlug(currentWorkSlug)
      setIsReturningToIndex(true)
    }

    if (getWorkSlugFromPath(normalized) !== null) {
      if (options.skipWorkMetaEnter === true) {
        setIsWorkMetaEntering(false)
      } else {
        setIsWorkMetaEntering(true)
      }
    } else {
      setIsWorkMetaEntering(false)
      if (!isWorkToIndexNavigation) {
        setIsWorkTitleClosing(false)
        setIsWorkTitleExitComplete(false)
      }
    }
    
    setIsProjectNavIndexEntry(route === '/' && getWorkSlugFromPath(normalized) !== null)
    setWorkProjectNavDirection(requestedDirection)
    const nextAboutReturnPath =
    normalized === '/about'
    ? normalizePath(
      typeof options.aboutReturnPath === 'string' && options.aboutReturnPath.trim().length > 0
      ? options.aboutReturnPath
      : route,
    )
    : null

    setAboutReturnPath(nextAboutReturnPath)
    if (normalized === '/about') {
      setActiveAboutHeartIndex(0)
    }
    window.history.pushState({ aboutReturnPath: nextAboutReturnPath }, '', normalized)
    setRoute(normalized)
  }
  
  const setWorkTransitionSnapshotFromNode = (slug, targetPath, node) => {
    if (!node) {
      return false
    }
    
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return false
    }
    
    const kickerSnapshot = ENABLE_INDEX_KICKER_ANIMATION ? getWorkKickerSnapshot(node) : null
    
    setWorkTransitionSnapshot({
      slug,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      sourcePath: route,
      targetPath,
      kicker: kickerSnapshot,
    })
    
    return true
  }
  
  const prepareWorkTransitionSnapshot = (nextPath, sourceNode) => {
    const normalized = normalizePath(nextPath)
    const nextWorkSlug = getWorkSlugFromPath(normalized)
    
    if (nextWorkSlug) {
      const workNode =
      sourceNode instanceof HTMLElement
      ? sourceNode
      : workCoverRefs.current.get(nextWorkSlug)
      
      if (setWorkTransitionSnapshotFromNode(nextWorkSlug, normalized, workNode)) {
        return
      }
    }
    
    if (normalized === '/' && isWorkPage && activeWork) {
      const activeWorkNode = workCoverRefs.current.get(activeWork.slug)
      if (setWorkTransitionSnapshotFromNode(activeWork.slug, normalized, activeWorkNode)) {
        return
      }
    }
    
    setWorkTransitionSnapshot(null)
  }
  
  const startWorkToIndexReturn = (sourceNode) => {
    const normalized = '/'
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isWorkTitleClosing || returnToIndexTimeoutRef.current !== null) {
      return
    }

    setWorkGalleryMorph(null)
    setLockedWorkSlug(null)
    setIsProjectNavContentReveal(false)
    prepareWorkTransitionSnapshot(normalized, sourceNode)

    if (prefersReducedMotion) {
      setIsWorkMetaEntering(false)
      navigate(normalized)
      return
    }

    startWorkTitleClosing()

    if (workTitleExitTimeoutRef.current !== null) {
      window.clearTimeout(workTitleExitTimeoutRef.current)
    }

    workTitleExitTimeoutRef.current = window.setTimeout(() => {
      workTitleExitTimeoutRef.current = null
      navigate(normalized)
    }, WORK_TO_INDEX_EXIT_WAIT_MS)
  }

  const startWorkTitleClosing = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    if (workTitleClosingStartedAtRef.current === null) {
      workTitleClosingStartedAtRef.current = true
      setIsWorkTitleExitComplete(false)
      if (workTitleExitCompleteTimeoutRef.current !== null) {
        window.clearTimeout(workTitleExitCompleteTimeoutRef.current)
      }

      workTitleExitCompleteTimeoutRef.current = window.setTimeout(() => {
        workTitleExitCompleteTimeoutRef.current = null
        setIsWorkTitleExitComplete(true)
      }, WORK_TO_INDEX_EXIT_WAIT_MS)
    }

    setIsWorkTitleClosing(true)
  }
  
  const startLogoRainbowBoost = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    
    setIsLogoRainbowBoost(true)
    
    if (logoBoostTimeoutRef.current !== null) {
      window.clearTimeout(logoBoostTimeoutRef.current)
    }
    
    logoBoostTimeoutRef.current = window.setTimeout(() => {
      logoBoostTimeoutRef.current = null
      setIsLogoRainbowBoost(false)
    }, LOGO_TRANSITION_BOOST_MS)
  }

  const scrollWorkShowPageToTopThen = (onComplete) => {
    const workShowPageNode = workShowPageRef.current
    const requestId = workTopScrollRequestRef.current + 1
    workTopScrollRequestRef.current = requestId

    const finish = () => {
      if (workTopScrollRequestRef.current !== requestId) {
        return
      }

      onComplete()
    }

    if (!(workShowPageNode instanceof HTMLElement) || workShowPageNode.scrollTop <= 1) {
      finish()
      return
    }

    let animationFrameId = null
    let hasCompleted = false

    const cleanup = () => {
      workShowPageNode.removeEventListener('scroll', onScroll)
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }

    const complete = () => {
      if (hasCompleted) {
        return
      }

      hasCompleted = true
      cleanup()
      finish()
    }

    const isWorkShowPageAtTop = () => workShowPageNode.scrollTop <= 1

    const waitForScrollTop = (remainingSettleFrames = WORK_SHOW_SCROLL_TOP_SETTLE_FRAMES) => {
      if (hasCompleted || animationFrameId !== null) {
        return
      }

      if (workTopScrollRequestRef.current !== requestId) {
        cleanup()
        return
      }

      if (isWorkShowPageAtTop() && remainingSettleFrames <= 0) {
        complete()
        return
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        waitForScrollTop(isWorkShowPageAtTop() ? remainingSettleFrames - 1 : WORK_SHOW_SCROLL_TOP_SETTLE_FRAMES)
      })
    }

    const onScroll = () => {
      waitForScrollTop()
    }

    workShowPageNode.addEventListener('scroll', onScroll, { passive: true })
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    workShowPageNode.scrollTo({ top: 0, behavior: scrollBehavior })
    waitForScrollTop()
  }
  
  const handleAboutClick = (event) => {
    if (!isPrimaryClick(event)) {
      return
    }
    
    event.preventDefault()
    setLockedWorkSlug(null)
    setIsProjectNavContentReveal(false)

    if (isAboutPage) {
      navigate(targetPath, { skipWorkMetaEnter: true })
      return
    }

    navigate('/about', { aboutReturnPath: route })
  }

  const updateDesignerLogoCursorPosition = (event) => {
    setDesignerLogoCursorPosition({ x: event.clientX, y: event.clientY })
  }

  const startDesignerLogoCursor = (event) => {
    if (designerLogoCursorTimeoutRef.current !== null) {
      window.clearTimeout(designerLogoCursorTimeoutRef.current)
      designerLogoCursorTimeoutRef.current = null
    }

    if ('clientX' in event && 'clientY' in event) {
      updateDesignerLogoCursorPosition(event)
    }

    setIsDesignerLogoCursorActive(true)
  }

  const stopDesignerLogoCursor = () => {
    if (designerLogoCursorTimeoutRef.current !== null) {
      window.clearTimeout(designerLogoCursorTimeoutRef.current)
    }

    designerLogoCursorTimeoutRef.current = window.setTimeout(() => {
      designerLogoCursorTimeoutRef.current = null
      setIsDesignerLogoCursorActive(false)
    }, DESIGNER_LOGO_CURSOR_LEAVE_DELAY_MS)
  }

  const finishIndexReturnState = () => {
    if (returnToIndexTimeoutRef.current !== null) {
      window.clearTimeout(returnToIndexTimeoutRef.current)
      returnToIndexTimeoutRef.current = null
    }

    if (indexKickerExitTimeoutRef.current !== null) {
      window.clearTimeout(indexKickerExitTimeoutRef.current)
      indexKickerExitTimeoutRef.current = null
    }

    workCoverRefs.current.forEach((workNode) => {
      clearWorkKickerClasses(workNode)
      clearWorkKickerInlineAnimation(workNode)
    })

    setIsReturningToIndex(false)
    setReturningSourceSlug(null)
    setReturningKickerSlug(null)
    setIsWorkTitleClosing(false)
    setIsWorkTitleExitComplete(false)
  }
  
  const handleNavClick = (event, nextPath) => {
    if (!isPrimaryClick(event)) {
      return
    }
    
    event.preventDefault()
    const normalized = normalizePath(nextPath)
    const nextWorkSlug = getWorkSlugFromPath(normalized)
    const isIndexToWork = route === '/' && nextWorkSlug !== null
    
    if (isIndexToWork) {
      const sourceNode = event.currentTarget
      const runIndexToWorkNavigation = () => {
        setLockedWorkSlug(null)
        setIsProjectNavContentReveal(false)
        prepareWorkTransitionSnapshot(normalized, sourceNode)
        navigate(normalized)
      }

      if (isReturningToIndex || returnToIndexTimeoutRef.current !== null) {
        finishIndexReturnState()
        runIndexToWorkNavigation()
        return
      }
      
      const isMobileViewport = window.matchMedia('(max-width: 900px)').matches
      if (
        sourceNode instanceof HTMLElement &&
        !isMobileViewport &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        if (indexKickerExitTimeoutRef.current !== null) {
          return
        }
        
        sourceNode.classList.remove('is-kicker-returning')
        sourceNode.classList.remove('is-kicker-exiting')
        sourceNode.classList.add('is-kicker-exiting')
        
        indexKickerExitTimeoutRef.current = window.setTimeout(() => {
          indexKickerExitTimeoutRef.current = null
          sourceNode.classList.remove('is-kicker-exiting')
          runIndexToWorkNavigation()
        }, INDEX_KICKER_EXIT_DURATION_MS)
        return
      }
      
      runIndexToWorkNavigation()
      return
    }
    
    if (isWorkPage && normalized === '/') {
      const sourceNode = event.currentTarget
      scrollWorkShowPageToTopThen(() => {
        startWorkToIndexReturn(sourceNode)
      })
      return
    }
    
    prepareWorkTransitionSnapshot(normalized, event.currentTarget)
    setLockedWorkSlug(null)
    setIsProjectNavContentReveal(false)
    navigate(normalized)
  }
  
  const handleProjectNavClick = (event, nextPath, projectNavDirection) => {
    if (!isPrimaryClick(event)) {
      return
    }
    
    event.preventDefault()
    const normalized = normalizePath(nextPath)
    const isWorkToWorkNavigation = isWorkPage && getWorkSlugFromPath(normalized) !== null
    const resolvedDirection =
    isWorkToWorkNavigation && (projectNavDirection === 'next' || projectNavDirection === 'prev')
    ? projectNavDirection
    : null
    
    if (isWorkToWorkNavigation) {
      if (
        isWorkTitleClosing ||
        isProjectNavSliding ||
        isWorkGalleryTransitionActive ||
        !activeWork ||
        isWorkThumbsSwitching
      ) {
        return
      }
      
      const runProjectNavNavigation = () => {
        startLogoRainbowBoost()
        setWorkTransitionSnapshot(null)
        setIsProjectNavIndexEntry(false)
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        
        if (prefersReducedMotion) {
          if (workThumbsRevealTimeoutRef.current !== null) {
            window.clearTimeout(workThumbsRevealTimeoutRef.current)
            workThumbsRevealTimeoutRef.current = null
          }
          pendingWorkThumbsRouteRef.current = null
          setLockedWorkSlug(null)
          setIsProjectNavContentReveal(false)
          setIsWorkThumbsSwitching(false)
          setIsWorkThumbsEntering(false)
          setWorkGalleryMorph(null)
          setIsWorkMetaEntering(false)
          navigate(normalized, { projectNavDirection: resolvedDirection })
          return
        }
        
        setIsWorkTitleClosing(true)
        setIsWorkTitleExitComplete(false)
        setWorkProjectNavDirection(resolvedDirection)
        setIsWorkThumbsSwitching(true)
        setIsWorkThumbsEntering(false)
        setIsWorkMetaEntering(true)
        const nextWorkSlug = getWorkSlugFromPath(normalized)
        const nextWork = nextWorkSlug ? works.find((work) => work.slug === nextWorkSlug) ?? null : null
        const requestId = projectNavRequestIdRef.current + 1
        projectNavRequestIdRef.current = requestId
        
        preloadImageUrl(getWorkPrimaryImageUrl(nextWork)).finally(() => {
          if (projectNavRequestIdRef.current !== requestId) {
            return
          }
          
          if (normalizePath(window.location.pathname) !== route) {
            setIsWorkThumbsSwitching(false)
            setIsWorkThumbsEntering(false)
            return
          }
          
          if (workThumbsRevealTimeoutRef.current !== null) {
            window.clearTimeout(workThumbsRevealTimeoutRef.current)
            workThumbsRevealTimeoutRef.current = null
          }
          
          pendingWorkThumbsRouteRef.current = normalized
          setLockedWorkSlug(activeWork.slug)
          setIsProjectNavContentReveal(true)
          setWorkShowKickerIsAnimating(false)
          const fromGalleryImages = visibleWorkGalleryImages
          const toGalleryImages = nextWork ? getWorkDetailImages(nextWork).slice(1) : []
          
          if (fromGalleryImages.length > 0 && toGalleryImages.length > 0) {
            setWorkGalleryMorph({
              fromSlug: activeWork.slug,
              toSlug: nextWorkSlug,
              direction: resolvedDirection,
              fromImages: fromGalleryImages,
              toImages: toGalleryImages,
            })
          } else {
            setWorkGalleryMorph(null)
          }
          
          setWorkPageCoverSlide({
            fromSlug: activeWork.slug,
            toSlug: nextWorkSlug,
            direction: resolvedDirection,
          })
          setWorkShowKickerTransition({
            fromLabel: getWorkOrderLabel(activeWorkIndex),
            toLabel: nextWorkSlug && nextWork ? getWorkOrderLabel(works.findIndex((work) => work.slug === nextWork.slug)) : getWorkOrderLabel(activeWorkIndex),
            direction: resolvedDirection,
          })
          if (workTitleExitTimeoutRef.current !== null) {
            window.clearTimeout(workTitleExitTimeoutRef.current)
            workTitleExitTimeoutRef.current = null
          }
          
          workTitleExitTimeoutRef.current = window.setTimeout(() => {
            workTitleExitTimeoutRef.current = null
            navigate(normalized, {
              projectNavDirection: resolvedDirection,
              skipWorkCoverSlideAnimation: true,
              preserveWorkCoverSlide: true,
              preserveWorkGalleryMorph: true,
            })
          }, TITLE_REVEAL_EXIT_WAIT_MS)
        })
      }
      
      scrollWorkShowPageToTopThen(runProjectNavNavigation)
      return
    }
    
    prepareWorkTransitionSnapshot(normalized, null)
    navigate(normalized, { projectNavDirection: resolvedDirection })
  }
  
  const handleWorkThumbScrollClick = (thumbIndex) => {
    const workShowPageNode = workShowPageRef.current
    if (!(workShowPageNode instanceof HTMLElement)) {
      return
    }
    
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    
    if (thumbIndex <= 0) {
      workShowPageNode.scrollTo({ top: 0, behavior: scrollBehavior })
      return
    }
    
    const galleryItemIndex = thumbIndex - 1
    const galleryTargetNode = workShowPageNode.querySelector(`[data-work-gallery-index="${galleryItemIndex}"]`)
    if (!(galleryTargetNode instanceof HTMLElement)) {
      return
    }
    
    galleryTargetNode.scrollIntoView({
      behavior: scrollBehavior,
      block: 'start',
      inline: 'nearest',
    })
  }
  
  const setWorkCoverRef = (slug, node) => {
    if (node) {
      workCoverRefs.current.set(slug, node)
      return
    }
    
    workCoverRefs.current.delete(slug)
  }
  
  const setWorkThumbRef = (thumbIndex, node) => {
    if (node) {
      workThumbRefs.current.set(thumbIndex, node)
      return
    }
    
    workThumbRefs.current.delete(thumbIndex)
  }

  const activateFreak = () => {
    setActiveAboutHeartIndex(0)
    setIsFreakHovered(true)
  }

  const deactivateFreak = () => {
    setIsFreakHovered(false)
  }

  const handleFreakPointerEnter = (event) => {
    if (event.pointerType === 'mouse') {
      activateFreak()
    }
  }

  const handleFreakPointerLeave = (event) => {
    if (event.pointerType === 'mouse') {
      deactivateFreak()
    }
  }

  const handleFreakPointerDown = () => {
    activateFreak()
  }

  const handleFreakKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    activateFreak()
  }
  
  return (
    <>
    <a className={`about-link${isWorkPage ? ' is-work' : ''}${isAboutPage ? ' is-about' : ''}${isIndexIntroVisible ? ' is-index-intro-chrome' : ''}`} href={targetPath} onClick={handleAboutClick}>
    {isAboutPage ? 'CLOSE' : 'ABOUT'}
    </a>
    
    <button
    type="button"
    className="displaygrid"
    onClick={() => setShowGrid((prev) => !prev)}
    aria-label={showGrid ? 'Nascondi griglia' : 'Mostra griglia'}
    >
    *
    </button>
    
    <div className={`grid-12 ${showGrid ? 'is-visible' : ''}`} aria-hidden="true">
    {Array.from({ length: 12 }).map((_, index) => (
      <div className="col" key={index} />
    ))}
    </div>

    {isPreloaderActive && activePreloaderFrameSvg && (
      <div
      className={`preloader${isPreloaderExiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label={`Loading ${preloaderCounter}%`}
      >
      <div
      className="preloader-frame"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: activePreloaderFrameSvg }}
      />
      <div className="preloader-counter">{preloaderCounter}</div>
      </div>
    )}
    
    <div
    className={`page-stage ${isAboutPage ? 'is-about' : ''} ${isWorkPage ? 'is-work' : ''} ${isReturningToIndex ? 'is-returning-index' : ''}${isIndexIntroVisible ? ' is-index-intro' : ''}${isIndexToWorkTransition ? ' is-index-to-work-transition' : ''}${pageStageProjectNavClass}${isProjectNavSliding ? ' is-project-nav-cover-sliding' : ''}${isProjectNavHandoffSettling ? ' is-project-nav-handoff-settling' : ''}`}
    ref={pageStageRef}
    style={{
      '--work-half-col': `${workMetrics.halfColWidth}px`,
      '--work-title-rows': visibleWorkTitle?.rows.length ?? 0,
      '--work-cover-nav-leave-duration': `${WORK_PAGE_COVER_LEAVE_DURATION_MS}ms`,
      '--work-cover-nav-enter-duration': `${WORK_PAGE_COVER_SLIDE_DURATION_MS}ms`,
      '--work-cover-nav-slide-duration': `${WORK_PAGE_COVER_SLIDE_DURATION_MS}ms`,
      '--index-intro-start-delay': isPreloaderExiting ? `${PRELOADER_INDEX_INTRO_START_DELAY_MS}ms` : '0ms',
    }}
    >
    {activeLogoFrame && (
      <a
      className={`logo-loop${isWorkPage ? ' is-compact is-link' : ''}${isAboutPage ? ' is-hidden-about' : ''}${isLogoRainbowBoost ? ' is-rainbow-boost' : ''}${isIndexIntroVisible ? ' is-index-intro-chrome' : ''}`}
      href={isWorkPage ? '/' : undefined}
      onClick={isWorkPage ? (event) => handleNavClick(event, '/') : undefined}
      onPointerEnter={() => setIsLogoHovered(true)}
      onPointerLeave={() => setIsLogoHovered(false)}
      onFocus={() => setIsLogoHovered(true)}
      onBlur={() => setIsLogoHovered(false)}
      aria-label={isWorkPage ? 'Back to Index' : undefined}
      aria-hidden={!isWorkPage}
      tabIndex={isWorkPage ? 0 : -1}
      >
      <div
      className="logo-loop-frame"
      style={{ '--logo-frame-url': `url("${activeLogoFrame.url}")` }}
      >
      <span
      className="logo-loop-svg"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: activeLogoFrame.svg }}
      />
      </div>
      </a>
    )}
    
    <div className={`signature-mark${isAboutPage ? ' is-hidden-about' : ''}${isIndexIntroVisible ? ' is-index-intro-chrome' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 215.59 19.36" xmlns="http://www.w3.org/2000/svg">
    <g>
    <path d="M0,9.68C0,3.99,3.54,0,9.18,0c4.7,0,7.37,2.54,8.13,6.58h-4.41c-.37-1.97-1.6-3.1-3.72-3.1-2.96,0-4.56,2.31-4.56,6.19s1.6,6.19,4.56,6.19c2.12,0,3.36-1.13,3.72-3.1h4.41c-.79,4.07-3.51,6.58-8.13,6.58C3.59,19.36,0,15.45,0,9.68Z" />
    <path d="M32.45,19.04l-3.78-6.48h-3.51v6.48h-4.43V.31h8.71c4.59,0,7.29,2.1,7.29,6.14,0,2.6-1.44,4.49-3.7,5.4l4.3,7.19h-4.88ZM32.27,6.45c0-1.78-1.1-2.65-3.41-2.65h-3.7v5.27h3.7c2.26,0,3.41-.79,3.41-2.62Z" />
    <path d="M69.23,19.04V3.8h-6.48V.31h17.52v3.49h-6.5v15.24h-4.54Z" />
    <path d="M83.87,19.04V.31h4.54v18.73h-4.54Z" />
    <path d="M106.64,19.04l-1.5-4.01h-7.92l-1.55,4.01h-4.43L98.69.31h5.12l7.48,18.73h-4.64ZM101.26,4.64h-.08l-2.65,6.92h5.32l-2.6-6.92Z" />
    <path d="M126.66,19.04l-8.71-13.22h-.05v13.22h-4.33V.31h5.19l7.74,11.8h.05V.31h4.33v18.73h-4.22Z" />
    <rect x="53.1" y="12.81" width="6.23" height="6.23" />
    <rect x="40.64" y="12.81" width="6.23" height="6.23" />
    <rect x="46.87" y="6.58" width="6.23" height="6.23" />
    <rect x="53.1" y=".35" width="6.23" height="6.23" />
    <rect x="40.64" y=".35" width="6.23" height="6.23" />
    <rect x="135.02" y="12.81" width="6.23" height="6.23" />
    <rect x="141.25" y="6.58" width="6.23" height="6.23" />
    <rect x="147.47" y=".36" width="6.23" height="6.23" />
    <path d="M170.78,19.04v-7.76h-8.39v7.76h-4.54V.32h4.54v7.5h8.39V.32h4.56v18.73h-4.56Z" />
    <path d="M179.1,11.52V.32h4.56v11.07c0,2.96,1.26,4.43,3.8,4.43s3.83-1.47,3.83-4.43V.32h4.54v11.23c0,5.04-2.96,7.82-8.37,7.82s-8.37-2.62-8.37-7.84Z" />
    <path d="M199.64,19.04V.32h8.37c4.43,0,6.92,1.68,6.92,5.19,0,1.65-1.34,3.41-2.78,3.88,1.94.58,3.44,2.15,3.44,4.25,0,3.46-2.44,5.4-7.06,5.4h-8.89ZM210.6,5.75c0-1.39-.92-2.2-2.75-2.2h-3.78v4.41h3.75c1.86,0,2.78-.81,2.78-2.2ZM211.13,13.43c0-1.55-1.1-2.33-2.99-2.33h-4.07v4.72h4.07c1.89,0,2.99-.81,2.99-2.39Z" />
    </g>
    </svg>
    </div>
    
    <div className="index-layer">
    <div className="works-strip" ref={worksStripRef}>
    {works.map((work, index) => {
      const isActiveWork = isWorkPage && activeWork?.slug === work.slug
      const isReturningSourceWork = isReturningToIndex && returningSourceSlug === work.slug
      const isReturningKickerWork = returningKickerSlug === work.slug
      const isProjectNavSourceWork = workPageCoverSlide?.fromSlug === work.slug
      const isProjectNavTargetWork = workPageCoverSlide?.toSlug === work.slug
      const isProjectNavMovingWork = isProjectNavSourceWork || isProjectNavTargetWork
      const nextWorkOrderLabel = getWorkOrderLabel((index + 1) % works.length)
      const workCoverNavDirectionClass =
      isProjectNavMovingWork && workPageCoverSlide?.direction === 'prev'
      ? ' is-project-nav-prev'
      : isProjectNavMovingWork
      ? ' is-project-nav-next'
      : ''
      const workCoverImageUrl = getWorkPrimaryImageUrl(work)
      
      return (
        <a
        className={`work-cover${isActiveWork ? ' is-active' : ''}${isReturningSourceWork ? ' is-returning-source' : ''}${isReturningKickerWork ? ' is-kicker-returning' : ''}${isProjectNavSourceWork ? ' is-project-nav-source is-project-nav-leaving' : ''}${isProjectNavTargetWork ? ' is-project-nav-target is-project-nav-entering' : ''}${isIndexTransitionSourceWork ? ' is-index-transition-source' : ''}${workCoverNavDirectionClass}`}
        key={work.slug}
        ref={(node) => setWorkCoverRef(work.slug, node)}
        style={{
          gridColumn:
          isActiveWork || isProjectNavMovingWork ? '4 / span 6' : `${work.startCol} / span 2`,
          '--work-offset': `${work.offsetVw}vw`,
          '--work-width-2col': `${workMetrics.twoColWidth}px`,
          '--work-width-6col': `${workMetrics.sixColWidth}px`,
          '--work-cover-nav-compact-scale-x':
          workMetrics.sixColWidth > 0 ? workMetrics.twoColWidth / workMetrics.sixColWidth : 0.32,
          '--work-cover-nav-compact-scale-y':
          workMetrics.expandedHeight > 0 ? workMetrics.twoColWidth / workMetrics.expandedHeight : 0.62,
          '--work-order-distance':
          transitionAnchorIndex >= 0 ? String(Math.abs(index - transitionAnchorIndex)) : '0',
          '--index-cover-index': index,
          '--index-kicker-exit-duration': `${INDEX_KICKER_EXIT_DURATION_MS}ms`,
          '--index-kicker-return-duration': `${INDEX_KICKER_RETURN_DURATION_MS}ms`,
          '--work-cover-image': `url("${workCoverImageUrl ?? INDEX_WORK_COVER_IMAGE_URL}")`,
        }}
        aria-label={`${work.title} ${work.year}`}
        href={getWorkPath(work)}
        onClick={(event) => handleNavClick(event, getWorkPath(work))}
        >
        <span className="work-cover-kicker-viewport" aria-hidden="true">
        <span className="work-cover-kicker-track">
        <span className="work-cover-kicker is-current">
        {getWorkOrderLabel(index)}
        </span>
        <span className="work-cover-kicker is-next">
        {nextWorkOrderLabel}
        </span>
        </span>
        </span>
        <div className="work-cover-caption">
        <strong>{work.title}</strong>
        <span>{work.year}</span>
        </div>
        </a>
      )
    })}
    </div>
    
    </div>
    
    <section className={`about-folder${isFreakHovered ? ' is-freak-hovered' : ''}`} aria-hidden={!isAboutPage}>
    <div className="about-folder-tab">ABOUT</div>
    <main className="about-page">
    {isFreakHovered && (
      <div className="about-hearts" aria-hidden="true">
      {aboutHeartFrames.length > 0 ? (
        <img
          key={aboutHeartFrames[activeAboutHeartIndex % aboutHeartFrames.length]}
          className={`about-heart about-heart-${(activeAboutHeartIndex % aboutHeartFrames.length) + 1}`}
          src={aboutHeartFrames[activeAboutHeartIndex % aboutHeartFrames.length]}
          alt=""
        />
      ) : null}
      </div>
    )}
    <div className="about-infos" aria-label="About intro">
    <div className="about-infos-row about-infos-row-1"><span className="about-freak-cancel">hi, i’m </span><span className="about-freak-highlight"> cristian</span></div>
    <div className="about-infos-row about-infos-row-2"><span className="about-freak-cancel">a person who </span><span className="about-freak-highlight"> loves</span></div>
    <div className="about-infos-row about-infos-row-3"><span className="about-freak-cancel">creating </span><span className="about-freak-highlight"> people</span><span className="about-freak-cancel">’s</span></div>
    <div className="about-infos-row about-infos-row-4"><span className="about-freak-cancel">spaces online</span></div>
    </div>
    <div className="about-roles">
    <div>motion and full stack Developer_</div>
    <div>Ai agent specialist_</div>
    </div>
    <div className="aboutLinks">
    <a className="about-link-item" href="mailto:crxtianhub@gmail.com" target="_blank" rel="noreferrer">
    <ion-icon className="aboutLinkArrow" name="arrow-up-sharp"></ion-icon>
    <span>EMAIL</span>
    </a>
    <a className="about-link-item" href="https://www.instagram.com/crxtianhub/" target="_blank" rel="noreferrer">
    <ion-icon className="aboutLinkArrow" name="arrow-up-sharp"></ion-icon>
    <span>INSTAGRAM</span>
    </a>
    <a className="about-link-item" href="https://www.linkedin.com/in/cristian-dagostino-motion-developer/" target="_blank" rel="noreferrer">
    <ion-icon className="aboutLinkArrow" name="arrow-up-sharp"></ion-icon>
    <span>LINKEDIN</span>
    </a>
    <a className="about-link-item" href="https://github.com/crxtian-hub" target="_blank" rel="noreferrer">
    <ion-icon className="aboutLinkArrow" name="arrow-up-sharp"></ion-icon>
    <span>GITHUB</span>
    </a>
    </div>
    <a
    className={`designedByLink${isDesignerLogoCursorActive ? ' is-logo-cursor' : ''}`}
    href="https://www.instagram.com/fliesneverlie/?hl=it"
    target="_blank"
    rel="noreferrer"
    onPointerEnter={startDesignerLogoCursor}
    onPointerMove={updateDesignerLogoCursorPosition}
    onPointerLeave={stopDesignerLogoCursor}
    onFocus={startDesignerLogoCursor}
    onBlur={stopDesignerLogoCursor}
    >
    <div className="designedBy wrapFullText">
    <span>DESIGN &amp; ART DIRECTION BY</span>
    <span>DAVIDE D’AGOSTINO - FLIESNEVERLIE <ion-icon className="designedByArrow" name="arrow-up-sharp"></ion-icon></span>
    </div>
    </a>
    </main>
    <div
      className="FREAK"
      data-bound="true"
      ref={freakRef}
      role="button"
      onPointerEnter={handleFreakPointerEnter}
      onPointerLeave={handleFreakPointerLeave}
      onPointerDown={handleFreakPointerDown}
      onFocus={activateFreak}
      onBlur={deactivateFreak}
      onKeyDown={handleFreakKeyDown}
      tabIndex={0}
      aria-pressed={isFreakHovered}
      aria-label="Freak hover trigger"
    ></div>
    </section>
    
    <section
    className={`work-show ${isWorkShowVisible ? 'is-open' : ''}${isWorkTitleClosing ? ' is-title-closing' : ''}${isWorkTitleExitComplete ? ' is-title-exit-complete' : ''}${isReturningToIndex ? ' is-returning-index' : ''}${isWorkMetaEntering ? ' is-meta-entering' : ''}${isProjectNavSliding ? ' is-project-nav-sliding' : ''}${isProjectNavScrollSettling ? ' is-project-nav-scroll-settling' : ''}${workProjectNavDirectionClass}${isProjectNavIndexEntry ? ' is-index-entry' : ''}${isWorkGalleryTransitionActive ? ' is-gallery-transitioning' : ''}`}
    aria-hidden={!isWorkShowVisible}
    >
    <main
    className="work-show-page"
    ref={workShowPageRef}
    style={{
      '--work-half-col': `${workMetrics.halfColWidth}px`,
      '--work-title-rows': visibleWorkTitle?.rows.length ?? 0,
      '--work-details-appear-delay': `${workDetailsAppearDelayMs}ms`,
      '--work-meta-appear-delay': `${workMetaAppearDelayMs}ms`,
      '--work-project-nav-slide-duration': `${WORK_PAGE_COVER_SLIDE_DURATION_MS}ms`,
      '--work-project-nav-leave-slide-duration': `${WORK_PAGE_COVER_LEAVE_DURATION_MS}ms`,
      '--work-project-nav-enter-slide-duration': `${WORK_PAGE_COVER_SLIDE_DURATION_MS}ms`,
      '--work-gallery-nav-leave-duration': `${WORK_GALLERY_NAV_LEAVE_DURATION_MS}ms`,
      '--work-gallery-nav-enter-duration': `${WORK_GALLERY_NAV_ENTER_DURATION_MS}ms`,
      '--work-show-gallery-leave-duration': `${WORK_GALLERY_NAV_LEAVE_DURATION_MS}ms`,
      '--work-gallery-nav-leave-delay': `${WORK_GALLERY_NAV_LEAVE_DELAY_MS}ms`,
      '--work-gallery-nav-enter-delay': `${WORK_GALLERY_NAV_ENTER_DELAY_MS}ms`,
      '--work-project-nav-leave-duration': `${TITLE_REVEAL_EXIT_WAIT_MS}ms`,
    }}
    >
    {isWorkPage && visibleWorkOrderLabel && (
      <div className="work-show-kicker" aria-hidden="true">
      <span className="work-show-kicker-mask">
      <span className={`work-show-kicker-track${workShowKickerState?.direction ? ` is-${workShowKickerState.direction}` : ''}${workShowKickerIsAnimating ? ' is-animating' : ''}`}>
      <span className="work-show-kicker-text is-current">{workShowKickerState?.currentLabel ?? visibleWorkOrderLabel}</span>
      <span className="work-show-kicker-text is-next">{workShowKickerState?.nextLabel ?? visibleWorkOrderLabel}</span>
      </span>
      </span>
      </div>
    )}
    {isWorkPage && visibleWorkTitle && !isWorkTitleExitComplete && (
      <h1 className="work-show-title" aria-label={visibleWorkTitle.label} key={`work-title-${visibleWorkSlug ?? route}`}>
      {visibleWorkTitle.rows.map((row, rowIndex) => (
        <span className="work-show-title-row" key={`row-${rowIndex}`} aria-hidden="true">
        {row.map((cell) => (
          <span
          className={`work-show-title-char${cell.isSpace ? ' is-space' : ''}${cell.isDot ? ' is-dot' : ''}`}
          key={cell.key}
          style={cell.style}
          >
          {cell.isSpace ? '' : cell.character}
          </span>
        ))}
        </span>
      ))}
      </h1>
    )}
    {isWorkPage && previousWork && nextWork && (
      <nav
      className={`work-show-project-nav${isProjectNavIndexEntry ? ' is-index-entry' : ''}${isProjectNavLocked ? ' is-locked' : ''}`}
      aria-label="Project navigation"
      >
      <a
      className="work-show-project-nav-link is-prev"
      href={getWorkPath(previousWork)}
      onClick={(event) => handleProjectNavClick(event, getWorkPath(previousWork), 'prev')}
      aria-label={`Previous project: ${previousWork.title}`}
      aria-disabled={isProjectNavLocked}
      >
      PREVIOUS
      </a>
      <a
      className="work-show-project-nav-link is-next"
      href={getWorkPath(nextWork)}
      onClick={(event) => handleProjectNavClick(event, getWorkPath(nextWork), 'next')}
      aria-label={`Next project: ${nextWork.title}`}
      aria-disabled={isProjectNavLocked}
      >
      NEXT
      </a>
      {visibleWorkImages.length > 0 && (
        <div
        className={`work-show-project-nav-thumbs${isWorkThumbsSwitching ? ' is-switching' : ''}${isWorkThumbsEntering ? ' is-entering' : ''}`}
        style={workProjectNavThumbsStyle}
        aria-label="Scroll to project images"
        ref={workThumbsRef}
        >
        <span
        className="work-show-project-nav-thumb-slider"
        style={workThumbSliderStyle}
        aria-hidden="true"
        />
        {visibleWorkImages.map((mediaUrl, thumbIndex) => (
          <button
          type="button"
          className="work-show-project-nav-thumb"
          key={`${visibleWork.slug}-thumb-${thumbIndex}`}
          onClick={() => handleWorkThumbScrollClick(thumbIndex)}
          ref={(node) => setWorkThumbRef(thumbIndex, node)}
          style={{ '--work-thumb-index': thumbIndex }}
          aria-label={`Scroll to media ${thumbIndex + 1}`}
          >
          <WorkThumbnailMedia
          className="work-show-project-nav-thumb-image"
          src={mediaUrl}
          alt=""
          />
          </button>
        ))}
        </div>
      )}
      </nav>
    )}
    {isWorkPage && (
      <section
      className="work-show-meta"
      aria-label="Project metadata"
      key={`work-meta-${visibleWorkSlug ?? route}`}
      >
      {visibleWorkMeta.map((item) =>
        item.href ? (
          <a
          className="work-show-meta-item is-link"
          key={item.key}
          style={{ gridColumn: item.gridColumn }}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          >
          {item.key === 'explore' ? (
            <>
            <span>{item.value}</span>
            <ion-icon className="work-show-meta-link-arrow" name="arrow-up-sharp"></ion-icon>
            </>
          ) : (
            item.value
          )}
          </a>
        ) : (
          <span
          className="work-show-meta-item"
          key={item.key}
          style={{ gridColumn: item.gridColumn }}
          >
          {item.value}
          </span>
        ),
      )}
      </section>
    )}
    {isWorkPageCoverVisible && (
      <figure
      key={`work-show-cover-${visibleWorkSlug ?? route}`}
      className={`work-show-cover${isWorkPageCoverPreloading ? ' is-preloading-transition' : ''}`}
      data-work-page-cover="true"
      style={{ '--work-show-cover-image': getCssUrlValue(visibleWorkCoverImage) }}
      >
      <WorkMedia
      key={`work-show-cover-media-${visibleWorkSlug ?? route}`}
      className="work-show-cover-image"
      src={visibleWorkCoverImage}
      alt={`${visibleWork.title} cover`}
      ariaLabel={`${visibleWork.title} cover`}
      eager
      />
      </figure>
    )}
    {isWorkShowVisible && visibleWork && visibleWorkGalleryImages.length > 0 && (
      <section
      className={`work-show-gallery${isWorkGalleryTransitionActive ? ` is-transition-active is-${workGalleryMorph?.direction ?? ''}${isWorkGalleryTransitionSource ? ' is-transition-source' : ''}${isWorkGalleryTransitionTarget ? ' is-transition-target' : ''}` : ''}`}
      aria-label="Project gallery"
      >
      {visibleWorkGalleryImages.map((mediaUrl, imageIndex) => (
        <figure
        className={`work-show-gallery-item${imageIndex === 0 ? ' is-cover' : ''}`}
        key={`${visibleWork.slug}-image-${imageIndex}`}
        data-work-gallery-index={imageIndex}
        style={{ '--work-gallery-item-delay': `${imageIndex * WORK_GALLERY_ITEM_STAGGER_MS}ms` }}
        >
        <WorkMedia
        className="work-show-gallery-image work-image-gallery"
        src={mediaUrl}
        alt={`${visibleWork.title} media ${imageIndex + 1}`}
        ariaLabel={`${visibleWork.title} media ${imageIndex + 1}`}
        eager={imageIndex === 0}
        />
        </figure>
      ))}
      {isWorkGalleryTransitionActive && workGalleryMorph && (
        <div
        className={`work-show-gallery-transition is-${workGalleryMorph.direction}`}
        aria-hidden="true"
        >
        <div className="work-show-gallery-transition-track is-leaving">
        {workGalleryMorph.fromImages.map((mediaUrl, imageIndex) => (
          <figure
          className="work-show-gallery-transition-item is-leaving"
          key={`morph-from-${workGalleryMorph.fromSlug ?? 'source'}-${imageIndex}`}
          style={{
            '--work-gallery-morph-delay': `${WORK_GALLERY_NAV_LEAVE_DELAY_MS}ms`,
            '--work-gallery-morph-fx-delay': `${WORK_GALLERY_NAV_LEAVE_DELAY_MS + imageIndex * WORK_GALLERY_MORPH_STAGGER_MS}ms`,
          }}
          >
          <WorkMedia
          className="work-show-gallery-transition-image"
          src={mediaUrl}
          alt=""
          eager
          />
        </figure>
        ))}
        </div>
        <div className="work-show-gallery-transition-track is-entering">
        {workGalleryMorph.toImages.map((mediaUrl, imageIndex) => (
          <figure
          className="work-show-gallery-transition-item is-entering"
          key={`morph-to-${workGalleryMorph.toSlug ?? 'target'}-${imageIndex}`}
          style={{
            '--work-gallery-morph-delay': `${WORK_GALLERY_NAV_ENTER_DELAY_MS}ms`,
            '--work-gallery-morph-fx-delay': `${WORK_GALLERY_NAV_ENTER_DELAY_MS + imageIndex * WORK_GALLERY_MORPH_STAGGER_MS}ms`,
          }}
          >
          <WorkMedia
          className="work-show-gallery-transition-image"
          src={mediaUrl}
          alt=""
          eager
          />
          </figure>
        ))}
        </div>
        </div>
      )}
      </section>
    )}
    </main>
    </section>
    </div>
    
    <p className={`copyright-vertical${isWorkPage ? ' is-work' : ''}${isAboutPage ? ' is-about' : ''}`}>
    CRISTIAND’AGOSTINO{currentYear}©
    </p>
    {isDesignerLogoCursorActive && (
      <img
      className="designer-logo-cursor"
      src={fliesneverlieLogoUrl}
      alt=""
      aria-hidden="true"
      style={{
        '--designer-logo-cursor-x': `${designerLogoCursorPosition.x}px`,
        '--designer-logo-cursor-y': `${designerLogoCursorPosition.y}px`,
      }}
      />
    )}
    </>
  )
}

export default App
