/**
 * Retrieves ADSB data from ADSB Exchange API based on the given parameters.
 *
 * @param {Object} params - The parameters for retrieving ADSB data.
 * @param {number} params.lat - The latitude of the location.
 * @param {number} params.lon - The longitude of the location.
 * @param {number} params.dist - The distance from the location.
 * @param {Object} options - The options for the API request.
 * @param {string} options.rapidApiKey - The RapidAPI key for authentication.
 * @return {Promise<Object>} - A promise that resolves with the retrieved ADSB data as an object.
 * @throws {Error} - If the request fails or encounters an error while retrieving ADSB data.
 */
export async function retrieveADSB(params: {lat: number, lon: number, dist: number}, options: {rapidApiKey: string}) {
  const url = `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${params.lat}/lon/${params.lon}/dist/${params.dist}/`;
  const reqOptions = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': options.rapidApiKey,
      'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, reqOptions);

    const responseBody = await response.text();
    return JSON.parse(responseBody)
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve ADSB data');
  }
}