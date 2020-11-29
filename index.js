/**
 * Turn your Now Playing into your Twitter Status~
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1
 * @license MIT
 */

const debug = require('debug')('musictweet')
const Twit = require('twit')
const events = require('events')

const config = require('./config/config.json')

// modules / Twitter
const source = require('./sources/spotify.js')
const web = require('./lib/web.js')
const T = new Twit(config.twitter)

const status = new events.EventEmitter

process.on('unhandledRejection', reason => {
  console.log('Unhandled Promise Rejection', reason)
});

status.on('changed', async song => {
  let formatted = config.template
    .replace('{{song}}', song.name)
    .replace('{{artist}}', song.artist)
    .replace('{{url}}', song.url)

  const update = {
    skip_status: 1,
    name: formatted
  }

  if (config.bio_template) {
    const bio = config.bio_template
      .replace('{{song}}', song.name)
      .replace('{{artist}}', song.artist)
      .replace('{{url}}', song.url)

    update.description = bio
  }

  if (formatted.length > 50) {
    formatted = formatted.substring(0, 47) + "..."
  }

  await T.post('account/update_profile', update)
})

status.on('changed', song => {
  console.log('new song', `${song.name} by ${song.artist}`)
})

const init = async () => {
  const provider = await source(config, status)
  console.log(provider)
  web(provider, status)
}

init()
