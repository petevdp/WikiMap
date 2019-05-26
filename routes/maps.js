"use strict"
const express = require('express');
const router  = express.Router();
const path = require('path');

module.exports = (queries, dataHelpers) => {
  router.get('/', async (req, res) => {
    res.json(await queries.getMaps());
  })

  router.get("/:mapid", async (req, res) => {
    res.json(await dataHelpers.getMapRepr(req.params.mapid, queries));
  });

  router.post("/new", async (req, res) => {
    try {
      const mapid = await queries.getNextMapid();
      console.log('mapid', mapid);
      console.log(req.body);
      if(!req.session.userid){
        res.status(400).send('not logged in!');
      }else{
        await queries.newMap({"ownerid": req.session.userid, "name" :"New Map"});
        res.redirect('/maps/' + mapid);
      }
    } catch (error) {
      res.status(400).send('something went wrong with the query!');
      throw error;
    }
  });

  router.put('/:mapid/save', async (req, res) => {
    try {
      const { mapid } = req.params
      const { mapInfo, points, } = req.body;

      console.log(req.body)

      await queries.updateMapInfo(mapid, mapInfo)
      {
        const pointids = points.map((point) => point.id)
        await queries.deletePointsNotIncluded(pointids, mapid)
      }

      await points.forEach(async (point) => {
        await queries.updatePointInfo(point.id, point)
      })
      res.json(await queries.getMapRepr(mapid, queries));
    } catch (err) {
      res.status(400).send('oh noes')
      throw err;
    }
  })

  router.put('/:mapid/addFavorite', async (req, res) => {
    const favorite = {
      mapid: req.params.mapid,
      userid: req.session.userid,
    }

    console.log('session: ', req.session);
    console.log('favorite: ', favorite)
    const [existingFavorite] = await queries.getFavorite(favorite);
    console.log('existingFavorite: ', existingFavorite)
    if (existingFavorite) {
      res.status(400).send('favorite already exists')
      return;
    }
    await queries.addFavorite(favorite)
    const userFavorites = await queries.getMapFavoriteUsers(favorite.mapid)
    console.log('adding')
    res.status(200).json(userFavorites);
  })

  router.delete('/:mapid/deleteFavorite', async (req, res) => {
    console.log('deleting')
    const favorite = {
      mapid: req.params.mapid,
      userid: req.session.userid,
    }
    const [existingFavorite] = await queries.getFavorite(favorite);
    if (!existingFavorite) {
      res.status(400).send('favorite doesn\'t exist')
      return;
    }
    await queries.deleteFavorite(existingFavorite.id);
    res.status(200).send('deleted favorite');
  });


  return router;
}
