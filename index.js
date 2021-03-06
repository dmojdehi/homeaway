'use strict'

const superagent = require('superagent')
const {URL} = require('url')

const API_URL = 'https://ws.homeaway.com/'

function buildQueryString(params){
  let qs = ''
  for(let i=0;i<params.length;i++){
    const key = Object.keys(params[i])[0]
    const val = params[i][key]
    if(i == 0){
      qs += `?${key}=${val}`
    }
    else{
      qs += `&${key}=${val}`
    }
  }
  return qs
}

function getIDFromURL(url){

  if(url.substr(0,5) !== 'https'){
    return url // URL is already an ID
  }

  const beginPoint = url.indexOf('/p')+2
  url = url.substr(beginPoint)

  let finalID = ''
  for(let singleChar of url){
    if(!Number.isNaN(+singleChar)){
      finalID += singleChar
    }
    else if(singleChar === 'v'){ // Handle VRBO listings
      finalID = 'v' + finalID
    }
    else{
      break
    }
  }

  return finalID

}

async function request(method,path,params){

  if(!this.access_token){
    throw new Error('You must call connect() before making requests. See README.md for help.')
  }

  try{
    const res = await superagent(method, API_URL+path)
      .set('authorization', `Bearer ${this.access_token}`)
      .set('cache-control','no-cache')
      .set('X-HomeAway-DisplayLocale','en_US')
      .query(params)

    return res.body
  }
  catch(e){
    try{
      e = JSON.parse(e.response.text)
    }
    catch(parseErr){
      throw e
    }

    throw new Error(`${e.violations[0].statusCode}: ${e.violations[0].description}`)
  }
}

module.exports = class HomeAway{

  constructor(c){

    this.access_token = null

    if(c && c.client && c.secret){
      this.client = c.client
      this.secret = c.secret
    }else{
      throw new Error('The configuration object must include both a client and secret property.')
    }

    request = request.bind(this)

  }

  async connect(){
    const res = await superagent('POST', API_URL + 'oauth/token').auth(this.client,this.secret)
    this.access_token = res.body.access_token
    return true
  }

  async quickSearch(q,pageSize){

    const params = [
      {q:q},
      {pageSize:pageSize}
    ]

    const qs = buildQueryString(params)

    const tmp = await request('GET','public/search'+qs)
    return tmp
  }

  async getListing(id,attributes){

    // We use a funky method for setting query strings here,
    // since the HA API allows multiple "q" values to be set.
    // JS objects can't share the same key, thus we use an array of objects

    id = getIDFromURL(id)

    let params = []
    params.push({id:id})

    for(let attr of attributes){
      params.push({q:attr})
    }

    const qs = buildQueryString(params)

    const tmp = await request('GET','public/listing'+qs)
    return tmp

  }

  // arrival & departure dates must be in 'yyyy-MM-dd' format
  async getQuote(listingId,unitId,arrivalDate,departureDate,adultsCount,additionalParams){

    listingId = getIDFromURL(listingId)

    // these args are required
    let params = []
    params.push({listingId})
    params.push({unitId})
    params.push({arrivalDate})
    params.push({departureDate})
    params.push({adultsCount})

    if (additionalParams) {
      for(let paramKey of additionalParams){
        params.push({paramKey: additionalParams[paramKey]})
      }
    }

    const qs = buildQueryString(params)

    const resp = await request('GET','public/quote'+qs)
    return resp
  }


  async me(){
    const me = await request('GET','https://ws.homeaway.com/public/me')
    return me
  }

  getCodeFromURL(url){ return new URL(url).searchParams.get('code') }

  async getUserToken(code){

    if(!code){
      throw new Error('A code must be provided. ')
    }

    try{
      const tmp = await superagent('POST', API_URL + 'oauth/token')
        .auth(this.client,this.secret)
        .send(`code=${code}`)
      return tmp.body
    }
    catch(e){
      if(e.status === 401){
        throw new Error('Unauthorized')
      }
      throw e
    }
  }

  async authenticate(code){
    try{
      const tmp = await this.getUserToken(code)

      const profile = await superagent('GET', 'https://ws.homeaway.com/public/me')
        .set('authorization', `Bearer ${tmp.access_token}`)
        .set('cache-control','no-cache')
        .set('X-HomeAway-DisplayLocale','en_US')

      tmp.firstName = profile.body.firstName
      tmp.lastName = profile.body.lastName

      delete tmp.token_type
      delete tmp.refresh_token

      return tmp
    }
    catch(e){
      throw e
    }

  }
}
