'use strict'

const superagent = require('superagent')

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
    else{
      break
    }
  }

  return finalID

}

async function request(method,path,params){

  if(!this.access_token){
    throw new Error('You must have an API token to make API requests. See README.md for help.')
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

    if(c && c.access_token){
      this.access_token = c.access_token
    }

    if(c && c.client && c.secret){
      this.client = c.client
      this.secret = c.secret
    }

    request = request.bind(this)

  }

  async connect(){
    const res = await superagent('POST', API_URL + 'oauth/token').auth(this.client,this.secret)
    this.access_token = res.body.access_token
    return true
  }

  setToken(token){
    this.access_token = token
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
}