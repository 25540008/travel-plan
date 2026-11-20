import * as destinationCatalogService from '../services/destinationCatalog.service.js';

export async function list(req, res) {
  res.json(await destinationCatalogService.listDestinations(req.valid.query));
}

export async function detail(req, res) {
  res.json(await destinationCatalogService.getDestinationBySlug(req.valid.params.slug));
}
