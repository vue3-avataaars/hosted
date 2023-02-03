/* eslint-disable import/first */
import * as dotenv from 'dotenv';

dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import { resolve } from 'path';
import { renderToString } from 'vue/server-renderer';
import {
  Avatar, CleanProps, Factory, Options, IOptionalAvatarProps, FactoryUrl,
} from 'vue3-avataaars';

type Hex = `#${string}`;

const validateProp = (options: string[], prop: string | undefined): string | undefined => {
  if (!prop) {
    return undefined;
  }

  return options.includes(prop) ? prop : undefined;
};

const colorTestRegex = /^[0-9a-fA-F]{6}/;
const validateColor = (color: string | undefined): Hex | undefined => {
  if (!color) {
    return undefined;
  }

  return colorTestRegex.test(color) ? `#${color}` : undefined;
};

const enforceReferer = (req: Request, res: Response, next: NextFunction) => {
  const ref = req.get('Referer');
  if (process.env.ALLOWED_REFERER_DOMAINS === undefined) {
    return next();
  }

  if (ref === undefined) {
    return res.status(400).send('No Referer when one is required!');
  }

  const allowedDomains = process.env.ALLOWED_REFERER_DOMAINS.split(',').map((e) => e.trim());
  if (!Array.isArray(allowedDomains)) {
    throw new Error('Invalid ALLOWED_REFERER_DOMAINS config!');
  }

  const url = new URL(ref);
  if (!allowedDomains.includes(url.hostname)) {
    return res.status(400).send('Invalid Referer!');
  }

  return next();
};

const app = express();
app.get('/', (req, res) => {
  res.sendFile(resolve(__dirname, '../public/index.html'));
});

app.get('/svg', enforceReferer, async (req, res) => {
  const { query } = req;

  const props: IOptionalAvatarProps = {
    isCircle: query?.isCircle ? Boolean(query.isCircle === 'true') : undefined,

    circleColor: validateColor(query?.circleColor as string),
    skinColor: validateColor(query?.skinColor as string),
    clothesColor: validateColor(query?.clothesColor as string),
    hairColor: validateColor(query?.hairColor as string),
    topColor: validateColor(query?.topColor as string),
    facialHairColor: validateColor(query?.facialHairColor as string),

    clothes: validateProp(Options.Clothes, query?.clothes as string),
    graphicShirt: validateProp(Options.GraphicShirt, query?.graphicShirt as string),
    top: validateProp(Options.Tops, query?.top as string),
    accessories: validateProp(Options.Accessories, query?.accessories as string),
    facialHair: validateProp(Options.FacialHair, query?.facialHair as string),
    eyes: validateProp(Options.Eyes, query?.eyes as string),
    eyebrows: validateProp(Options.Eyebrows, query?.eyebrows as string),
    mouth: validateProp(Options.Mouths, query?.mouth as string),
  };

  const avatar = Avatar(Factory(CleanProps(props)));
  const str = await renderToString(avatar);

  // If the URL came with a hash, it can be cached for a long time!
  if (query?.hash) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  res.set('Content-Type', 'image/svg+xml');
  res.send(str);
});

app.get('/random-svg', enforceReferer, async (req, res) => {
  res.redirect(FactoryUrl(CleanProps(Factory()), process.env.SELF_DOMAIN));
});

app.listen(process.env.LISTEN_PORT, () => {
  console.log(`The application is listening on port ${process.env.LISTEN_PORT}!`);
});
