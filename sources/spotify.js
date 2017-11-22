/**
 * Spotify source.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */
const debug   = require('debug')('musictweet:spotify')
const Spotify = require('spotify-web-api-node')
const fs      = require('fs-extra')

let last      = {}

const refresher = async spotify => {
  return setInterval(async () => {
    debug('auth', 'refreshing access token')

    try {
      const result = await spotify.refreshAccessToken()
      spotify.setAccessToken(result.body.access_token)

      const creds  = require('../creds.json')
      fs.writeFile('./creds.json', JSON.stringify({
        access_token: result.body.access_token,
        refresh_token: creds.refresh_token
      }, 0, 2), 'utf8')
    } catch(e) {
      throw new Error('Failed to refresh access token.')
    }
    debug('auth', 'refreshed token')
  }, 40000)

  debug('auth', 'setup auth refresh timer')
}

const poll = async (spotify, event) => {

  setInterval(async () => {
    const playing = await spotify.getMyCurrentPlayingTrack()

    if(!playing.body) return // skip empty playing

    const name     = playing.body.item.name;
    const artist   = playing.body.item.album.artists[0].name
    const url      = playing.body.item.external_urls.spotify
    const time_at  = playing.body.progress_ms
    const time_max = playing.body.item.duration_ms
    const status   = {
      name: name,
      artist: artist,
      url: url,
      album_image: playing.body.item.album.images[0], // seems to be the highest res
      time: {
        at: time_at,
        max: time_max
      }
    }

    // debug info, don't care if completed
    fs.writeFile('./now_playing.debug.json', JSON.stringify(playing.body, 0, 2), 'utf8')
    //debug('now_playing', status)

    // trigger event
    if(last.name !== name) {
      event.emit('changed', status)
    } else if(time_at < last.time) { // check time
      event.emit('changed', status)
    }

    // emit time sync
    event.emit('sync', {
      sync: true,
      time: {
        at: status.time.at
      }
    })

    last = status
  }, 4000)
}

module.exports = async (config, event) => {
  const spotify = new Spotify(config.spotify)

  // set access token
  try {
    const auth = require('../creds.json')
    spotify.setAccessToken(auth.access_token)
    spotify.setRefreshToken(auth.refresh_token)

    const me = await spotify.getMe() // test it
    debug('me', me.body)
  } catch(e) {
    debug('err', e)
    if(!config.spotify.code) {
      console.log('Please visit this URL and install as spotify#code in config',
        spotify.createAuthorizeURL(['user-read-recently-played', 'user-read-playback-state'], '1'))

      process.exit(1)
    }

    const result = await spotify.authorizationCodeGrant(config.spotify.code)
    spotify.setAccessToken(result.body.access_token)
    spotify.setRefreshToken(result.body.refresh_token)

    fs.writeFile('./creds.json', JSON.stringify({
      access_token: result.body.access_token,
      refresh_token: result.body.refresh_token
    }, 0, 2), 'utf8')
  }

  // setup refresher
  await refresher(spotify)

  await poll(spotify, event)

  return {
    getInfo: function() {
      return last
    }
  }
}
