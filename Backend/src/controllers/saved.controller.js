import * as savedService from '../services/saved.service.js';

export async function toggleSave(req, res, next) {
  try {
    const result = await savedService.toggleSaveItem(req.user.id, req.valid.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function removeSave(req, res, next) {
  try {
    const result = await savedService.removeSavedItem(req.user.id, req.valid.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSaved(req, res, next) {
  try {
    const result = await savedService.getSavedItems(req.user.id, req.valid.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}