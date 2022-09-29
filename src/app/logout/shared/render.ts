import fs from 'fs/promises';
import Mustache from 'mustache';

/**
 * Render data in a mustache template
 *
 * @param {object} data An object of data to use in the template
 * @param {string} templatePath the path to the mustache template
 * @returns string
 */
export async function render(data: any, templatePath: any, partials: any) {
  const template = await fs.readFile(templatePath, 'utf8');
  let partialTemplates : any = {};
  if (partials) {
    const keys = Object.keys(partials);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const partial = await fs.readFile(partials[key], 'utf8');
      partialTemplates[key] = partial;
    }
  }
  return Mustache.render(template.toString(), data, partialTemplates);
}