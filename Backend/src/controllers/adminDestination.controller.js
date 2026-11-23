import * as service from '../services/adminDestination.service.js';

export const createDestination = async (req, res) => res.status(201).json(await service.createDestination(req.valid.body));
export const updateDestination = async (req, res) => res.json(await service.updateDestination(req.valid.params.id, req.valid.body));
export const deleteDestination = async (req, res) => res.json(await service.deleteDestination(req.valid.params.id));

export const createSpot = async (req, res) => res.status(201).json(await service.createSpot(req.valid.params.id, req.valid.body));
export const updateSpot = async (req, res) => res.json(await service.updateSpot(req.valid.params.id, req.valid.params.spotId, req.valid.body));
export const deleteSpot = async (req, res) => res.json(await service.deleteSpot(req.valid.params.id, req.valid.params.spotId));

export const createCost = async (req, res) => res.status(201).json(await service.createCost(req.valid.params.id, req.valid.body));
export const updateCost = async (req, res) => res.json(await service.updateCost(req.valid.params.id, req.valid.params.costId, req.valid.body));
export const deleteCost = async (req, res) => res.json(await service.deleteCost(req.valid.params.id, req.valid.params.costId));