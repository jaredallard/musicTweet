/**
 * Enables Broadcast Song Changes
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const WebSocket = require('ws')
const express   = require('express')
const http      = require('http')
const async     = require('async')
const debug     = require('debug')('musictweet:web')

const app = express();

/**
 * Broadcast data to multiple clients asynchonously.
 *
 * @param  {Array} clients List of clients
 * @param  {*} data        Data to send
 * @return {Promise}       ...
 */
const broadcast = async (clients, data) => {
  return new Promise((resolv, reject) => {
    debug('ws', 'broadcast len('+clients.length+')', data)

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data)
        } catch (err) {
          debug('failed to publish to a client:', err.message | err)
        }
      }
    })

    return resolv()
  })
};

module.exports = (spotify, status) => {

  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    debug('new client')
    ws.send(JSON.stringify(spotify.getInfo()))
  });

  server.listen(8080, () => {
    debug('init', 'Listening on', server.address().port);
  });

  status.on('changed', async music => {
    await broadcast(wss.clients, JSON.stringify(music))
  })

  status.on('sync', async time => {
    await broadcast(wss.clients, JSON.stringify(time))
  })
}
