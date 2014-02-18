var secrets = require('../config/secrets');
var User = require('../models/User');
var querystring = require('querystring');
var validator = require('validator');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var _ = require('underscore');
var graph = require('fbgraph');
var LastFmNode = require('lastfm').LastFmNode;

/**
 * GET /api
 * List of API examples.
 */

exports.getApi = function(req, res) {
  res.render('api/index', {
    title: 'API Browser'
  });
};

/**
 * GET /api/lastfm
 * Last.fm API example.
 */

exports.getLastfm = function(req, res, next) {
  var lastfm = new LastFmNode(secrets.lastfm);
  async.parallel({
      artistInfo: function(done) {
        lastfm.request("artist.getInfo", {
          artist: 'Epica',
          handlers: {
            success: function(data) {
              done(null, data);
            },
            error: function(err) {
              done(err);
            }
          }
        });
      },
      artistTopAlbums: function(done) {
        lastfm.request("artist.getTopAlbums", {
          artist: 'Epica',
          handlers: {
            success: function(data) {
              var albums = [];
              _.each(data.topalbums.album, function(album) {
                albums.push(album.image.slice(-1)[0]['#text']);
              });
              done(null, albums.slice(0, 4));
            },
            error: function(err) {
              done(err);
            }
          }
        });
      }
    },
    function(err, results) {
      if (err) return next(err.message);
      var artist = {
        name: results.artistInfo.artist.name,
        image: results.artistInfo.artist.image.slice(-1)[0]['#text'],
        tags: results.artistInfo.artist.tags.tag,
        bio: results.artistInfo.artist.bio.summary,
        stats: results.artistInfo.artist.stats,
        similar: results.artistInfo.artist.similar.artist,
        topAlbums: results.artistTopAlbums
      };
      res.render('api/lastfm', {
        title: 'Last.fm API',
        artist: artist
      });
    });
};
