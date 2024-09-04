import express from 'express';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import AppController from '../controllers/AppController';
import FilesController from '../controllers/FilesController';

const myRouter = express.Router();

// routes
const routeController = (app) => {
  app.use('/', myRouter);

  myRouter.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  myRouter.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  myRouter.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  myRouter.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  myRouter.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  myRouter.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });

  myRouter.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });

  myRouter.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });

  myRouter.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });

  myRouter.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res);
  });

  myRouter.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res);
  });

  myRouter.post('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res);
  });
};

export default routeController;
