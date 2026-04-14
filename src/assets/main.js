import './styles.css'

const audioPlayer = document.getElementById('main-audio')
const playlist = document.getElementById('playlist')
const playlistItems = Array.from(playlist.children)
const tabBtns = document.querySelectorAll('.tab-btn')
const statusContainer = document.getElementById('status-container')
const statusText = document.getElementById('status-text')
const trackInfo = document.getElementById('track-info')
const mainLogo = document.getElementById('main-logo')
const playPauseBtn = document.getElementById('play-pause-btn')
const prevBtn = document.getElementById('prev-btn')
const nextBtn = document.getElementById('next-btn')
const volumeSlider = document.getElementById('volume-slider')
const dynamicVolumeIcon = document.getElementById('dynamic-volume-icon')
const customPlayerControls = document.getElementById('custom-player')
const volumeRow = document.getElementById('volume-row')
const isMobile = matchMedia('(pointer: coarse)').matches

const PLAY_ICON = '▶'
const PAUSE_ICON = '❚❚'
const ERROR_ICON = '❌'
const LOCAL_STORAGE_VOLUME_KEY = 'radio_playlist_volume'

let currentIndex = -1
let lastVolume = 1
let hlsInstance = null
let metadataTimeout = null
let metadataSSE = null
let currentTrackString = ''

const updateMediaSession = (title, artist, artworkUrl) => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: [{ src: artworkUrl || mainLogo.src, sizes: '512x512', type: 'image/jpeg' }]
    })
  }
}

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => playPauseBtn.click())
  navigator.mediaSession.setActionHandler('pause', () => playPauseBtn.click())
  navigator.mediaSession.setActionHandler('previoustrack', () => prevBtn.click())
  navigator.mediaSession.setActionHandler('nexttrack', () => nextBtn.click())
}

for (const btn of tabBtns) {
  btn.addEventListener('click', () => {
    for (const b of tabBtns) b.classList.remove('active')
    btn.classList.add('active')

    const targetGenre = btn.getAttribute('data-target')
    for (const li of playlistItems) {
      if (targetGenre === 'all' || li.getAttribute('data-genre') === targetGenre) {
        li.classList.remove('hidden')
      } else {
        li.classList.add('hidden')
      }
    }
  })
}

const MAP_METADATA = {
  public: (data) => data.current_track.title,
  laut: (data) => `${data.artist.name} - ${data.title}`,
  zeno: (data) => data.streamTitle,
  fmcube: (data) => `${data.artist} - ${data.title}`,
  animeradio: (data) => `${data.songHistoryList[0].artist} - ${data.songHistoryList[0].title}`,
  ascoltareradio: (data) => `${data.result[0].track_artist} - ${data.result[0].track_title}`
}

const updateMainLogo = (src) => {
  if (mainLogo.src === src) return
  mainLogo.style.opacity = 0
  setTimeout(() => {
    mainLogo.src = src
    mainLogo.style.opacity = 1
    updateMediaSession(currentTrackString, statusText.innerText, src)
  }, 150)
}

const fetchAndSetCoverArt = async (query) => {
  const activeItem = playlistItems[currentIndex]
  const defaultRadioLogo = activeItem.querySelector('img').src

  if (!query) {
    updateMainLogo(defaultRadioLogo)
    return
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`
    const response = await fetch(url)
    const data = await response.json()

    if (data.resultCount > 0 && data.results[0].artworkUrl100) {
      const highResCover = data.results[0].artworkUrl100.replace('100x100bb.jpg', '512x512bb.jpg')
      updateMainLogo(highResCover)
    } else {
      updateMainLogo(defaultRadioLogo)
    }
  } catch (err) {
    console.error('iTunes API Error:', err)
    updateMainLogo(defaultRadioLogo)
  }
}

const destroyHls = () => {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
}

const stopMetadataTracking = () => {
  if (metadataTimeout) {
    clearTimeout(metadataTimeout)
    metadataTimeout = null
  }
  if (metadataSSE) {
    metadataSSE.close()
    metadataSSE = null
  }
}

const startMetadataTracking = (apiUrl, radioName) => {
  stopMetadataTracking()

  if (!apiUrl || !radioName) {
    trackInfo.innerText = ''
    return
  }

  const handleNewTrackData = (data) => {
    const newTrack = MAP_METADATA[radioName](data)
    if (newTrack !== currentTrackString) {
      currentTrackString = newTrack
      trackInfo.innerText = newTrack
      fetchAndSetCoverArt(newTrack)
    }
  }

  if (radioName === 'zeno') {
    metadataSSE = new EventSource(apiUrl)
    metadataSSE.onmessage = (event) => {
      try {
        handleNewTrackData(JSON.parse(event.data))
      } catch (err) {
        console.error('Zeno Parse Error:', err)
      }
    }
    metadataSSE.onerror = () => {
      console.warn('Lost connection, reconnecting…')
    }
  } else {
    const fetchCurrentMeta = async () => {
      try {
        const response = await fetch(apiUrl)
        const data = await response.json()
        handleNewTrackData(data)
        let nextFetchDelay = 10000
        if (radioName === 'laut' && data.ends_at) {
          const delayUntilEnd = new Date(data.ends_at).getTime() - Date.now()
          if (delayUntilEnd > 1000) {
            nextFetchDelay = delayUntilEnd + 500
          }
        }
        metadataTimeout = setTimeout(fetchCurrentMeta, nextFetchDelay)
      } catch (err) {
        console.error('Fetch Metadata Error:', err)
        trackInfo.innerText = `${ERROR_ICON} Metadata error`
        metadataTimeout = setTimeout(fetchCurrentMeta, 15000)
      }
    }
    fetchCurrentMeta()
  }
}

const doLoading = () => {
  statusContainer.classList.remove('is-playing')
  statusContainer.classList.add('is-loading')
  playPauseBtn.innerText = PAUSE_ICON
}

audioPlayer.addEventListener('waiting', doLoading)

audioPlayer.addEventListener('playing', () => {
  statusContainer.classList.remove('is-loading')
  statusContainer.classList.add('is-playing')
  playPauseBtn.innerText = PAUSE_ICON

  const activeItem = playlistItems[currentIndex]
  const currentApi = activeItem.getAttribute('data-api')
  const currentRadioName = activeItem.getAttribute('data-name')
  startMetadataTracking(currentApi, currentRadioName)

  updateMediaSession(currentTrackString, statusText.innerText, mainLogo.src)
})

audioPlayer.addEventListener('pause', () => {
  statusContainer.classList.remove('is-playing', 'is-loading')
  playPauseBtn.innerText = PLAY_ICON
  stopMetadataTracking()
})

audioPlayer.addEventListener('error', () => {
  statusContainer.classList.remove('is-playing', 'is-loading')
  statusText.innerText = `${ERROR_ICON} Stream error`
  trackInfo.innerText = ''
  playPauseBtn.innerText = PLAY_ICON
  stopMetadataTracking()
})

const loadAndPlay = (index) => {
  if (index < 0 || index >= playlistItems.length) return

  currentIndex = index

  stopMetadataTracking()
  destroyHls()

  audioPlayer.removeAttribute('src')
  audioPlayer.load()

  currentTrackString = ''
  trackInfo.innerText = ''

  playlistItems.forEach(li => li.classList.remove('active'))
  const activeItem = playlistItems[currentIndex]
  activeItem.classList.add('active')

  activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  updateMainLogo(activeItem.querySelector('img').src)

  statusText.innerText = activeItem.querySelector('span').innerText.trim()

  doLoading()

  const url = activeItem.getAttribute('data-url')

  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      hlsInstance = new Hls()
      hlsInstance.loadSource(url)
      hlsInstance.attachMedia(audioPlayer)
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
        audioPlayer.play().catch(() => { })
      })
      hlsInstance.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          audioPlayer.dispatchEvent(new Event('error'))
        }
      })
    } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      audioPlayer.src = url
      audioPlayer.play().catch(() => { })
    }
  } else {
    audioPlayer.src = url
    audioPlayer.play().catch(() => { })
  }
}

const getFirstVisibleIndex = () => playlistItems.findIndex(li => !li.classList.contains('hidden'))

playPauseBtn.addEventListener('click', () => {
  if (currentIndex === -1) {
    const startIndex = getFirstVisibleIndex()
    if (startIndex === -1) return
    loadAndPlay(startIndex)
  }
  if (audioPlayer.paused) {
    loadAndPlay(currentIndex)
  } else {
    audioPlayer.pause()
    audioPlayer.removeAttribute('src')
    audioPlayer.load()
    destroyHls()
    statusContainer.classList.remove('is-playing')
    playPauseBtn.innerText = PLAY_ICON
  }
})

prevBtn.addEventListener('click', () => {
  if (currentIndex === -1) return
  let newIndex = currentIndex
  do {
    newIndex--
    if (newIndex < 0) newIndex = playlistItems.length - 1
  } while (playlistItems[newIndex].classList.contains('hidden') && newIndex !== currentIndex)
  loadAndPlay(newIndex)
})

nextBtn.addEventListener('click', () => {
  if (currentIndex === -1) return
  let newIndex = currentIndex
  do {
    newIndex++
    if (newIndex >= playlistItems.length) newIndex = 0
  } while (playlistItems[newIndex].classList.contains('hidden') && newIndex !== currentIndex)
  loadAndPlay(newIndex)
})

playlist.addEventListener('click', (e) => {
  const clickedItem = e.target.closest('li')
  if (!clickedItem) return

  const index = playlistItems.indexOf(clickedItem)
  if (index !== -1) loadAndPlay(index)
})

const applyVolume = (vol) => {
  vol = Math.max(0, Math.min(1, vol))
  audioPlayer.volume = vol
  if (volumeSlider) volumeSlider.value = vol
  if (dynamicVolumeIcon) dynamicVolumeIcon.innerText = vol === 0 ? '🔇' : vol < 0.35 ? '🔈' : vol < 0.75 ? '🔉' : '🔊'
  if (vol > 0) lastVolume = vol
  localStorage.setItem(LOCAL_STORAGE_VOLUME_KEY, vol)
}

if (isMobile) {
  audioPlayer.volume = 1
  if (volumeRow) volumeRow.style.display = 'none'
} else {
  const savedVolume = localStorage.getItem(LOCAL_STORAGE_VOLUME_KEY)
  applyVolume(savedVolume !== null ? Number.parseFloat(savedVolume) : 1)

  volumeSlider.addEventListener('input', (e) => applyVolume(Number.parseFloat(e.target.value)))

  dynamicVolumeIcon.addEventListener('click', () => applyVolume(audioPlayer.volume > 0 ? 0 : lastVolume))

  customPlayerControls.addEventListener('wheel', (e) => {
    e.preventDefault()
    applyVolume(audioPlayer.volume + (e.deltaY < 0 ? 0.1 : -0.1))
  }, { passive: false })
}
