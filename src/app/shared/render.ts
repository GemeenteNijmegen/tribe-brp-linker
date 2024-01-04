import Mustache from 'mustache';
import * as footer from './footer.mustache';
import * as header from './header.mustache';

/**
 * Render data in a mustache template
 *
 * @param {object} data An object of data to use in the template
 * @param {string} templatePath the path to the mustache template
 * @returns string
 */
export async function render(data: any, template: any, partials?: any) {
  let partialTemplates : any = {
    header: header.default,
    footer: footer.default,
    ...partials,
  };
  return Mustache.render(template, data, partialTemplates);
}
