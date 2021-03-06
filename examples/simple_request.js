const HomeAway = require('homeaway')

// A basic example which creates a new HomeAway client, connects, and makes a request.
// ====

// This should never throw an error, so it can be called outside of a try/catch.
const ha = new HomeAway({
  client:'your-client-id-here',
  secret: 'your-secret-here'
})

async function myFunc(){
  try{
    // connect() and all other methods on ha could throw.
    // You should catch these errors somewhere within your app.
    await ha.connect()
    const listing = await ha.getListing('1644423',['LOCATION','RATES'])
    console.log(listing)

    const quote = await ha.getQuote('1644423','3216409', '2018-08-10', '2018-08-12','2')
    console.log(quote)
  }
  catch(e){
    console.log(e)
  }
}

myFunc()
