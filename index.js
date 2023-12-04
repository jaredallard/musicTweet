/**
 * Turns your now playing into a cool website. Yeah. That's all it does.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1
 * @license MIT
 */

const debug = require('debug')('musictweet')
const events = require('events')

const config = require('./config/config.json')

// modules
const source = require('./sources/spotify.js')
const web = require('./lib/web.js')

const status = new events.EventEmitter

process.on('unhandledRejection', reason => {
  console.log('Unhandled Promise Rejection', reason)
});

status.on('changed', song => {
  console.log('new song', `${song.name} by ${song.artist}`)
})

const init = async () => {
  const provider = await source(config, status)

  console.log("api started on :8080")
  web(provider, status)
}

init()
