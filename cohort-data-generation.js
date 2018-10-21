// Include momentJS

var cohortDataModule = {}

cohortDataModule.settings = {
  firstDate: '2018-03-01',
  numberInitialCustomers: [50,150],
  cohortSizeGrowth: [3,10],

  values: {
    starting: [50,300],
    expansion: [-1,10]
  },
  churn: [10,20],
  churnByPeriods: [],
  churnGrowth: [12,18],
  multipliers: {
    cohort: {
      id: 3,
      multiplier: [1,1] // [1.5,2]
    },
    relativePeriod: {
      id: 2,
      multiplier: [1,1] // [2,3]
    },
    absolutePeriod: {
      id: '2018-07-01',
      multiplier: [1,1] // [2,3]
    }
  }
}

cohortDataModule.dataset = []

cohortDataModule.randomWithinRange = function( range ){
  var rangeSpread = range[1] - range[0]
  return range[0] + Math.random() * rangeSpread
}


cohortDataModule.generateCustomers = function(){
  console.log( 'generateCustomers' )
  var cohortMoment = moment( cohortDataModule.settings.firstDate, 'YYYY-MM-DD' )

  var cohortId = 0
  var numberCustomersToCreate = 0
  var previousCohortSize = 0
  var customerId = 0

  // For each cohort, create customers
  while( cohortMoment.isSameOrBefore( moment() ) ){
    cohortId ++

    // How many customer for the cohort
    if( cohortId === 1 ){
      numberCustomersToCreate = cohortDataModule.randomWithinRange( cohortDataModule.settings.numberInitialCustomers )
    }else{
      var cohortGrowth = cohortDataModule.randomWithinRange( cohortDataModule.settings.cohortSizeGrowth )
      numberCustomersToCreate = previousCohortSize * ( 1 + ( cohortGrowth / 100 ) )
    }
    numberCustomersToCreate = Math.round( numberCustomersToCreate )
    // Keep track of cohort sizes
    previousCohortSize = numberCustomersToCreate

    console.log( cohortMoment.format( 'YYYY-MM-DD' ), 'cohort size:', numberCustomersToCreate )

    while( numberCustomersToCreate > 0 ){
      customerId ++
      cohortDataModule.generateOneCustomer( {
        cohortId: cohortId,
        customerId: customerId,
        joiningMoment: cohortMoment
      } )

      numberCustomersToCreate --
    }

    cohortMoment.add( 1, 'month' )
  }
}


cohortDataModule.updateChurnRange = function( cohortId ){
  if( !cohortDataModule.settings.churnByPeriods[ cohortId ] ){
    cohortDataModule.settings.churnByPeriods[ cohortId ] = []

    var churnGrowth = ( 1 + cohortDataModule.randomWithinRange( cohortDataModule.settings.churnGrowth )/100 )

    churnBaseArray = cohortDataModule.settings.churnByPeriods[ ( cohortId-1 ) ] || cohortDataModule.settings.churn
    cohortDataModule.settings.churnByPeriods[ cohortId ][0] = churnBaseArray[0] * churnGrowth
    cohortDataModule.settings.churnByPeriods[ cohortId ][1] = churnBaseArray[1] * churnGrowth
  }
}


cohortDataModule.generateOneCustomer = function( customerSettings ){

  // console.log( customerSettings.customerId )

  var periodId = 0
  var periodMoment = customerSettings.joiningMoment.clone()
  var isChurned = false
  var periodValue = 0
  var periodValuePrevious = 0
  var periodChange = 0
  var multiplierCohort = 1
  var multiplierPeriodRelative = 1
  var multiplierPeriodAbsolute = 1
  var multiplierUsed = 1
  var isPeriodSpecial = false

  // pass every periods from joining
  while( periodMoment.isSameOrBefore( moment() ) && isChurned === false ){
    // console.log( periodMoment.format( 'YYYY-MM-DD' ) )

    periodId ++
    if( periodId === 1 ){
      periodValue = cohortDataModule.randomWithinRange( cohortDataModule.settings.values.starting )

      // By Cohort
      if( customerSettings.cohortId === cohortDataModule.settings.multipliers.cohort.id ){
        multiplierCohort = cohortDataModule.randomWithinRange( cohortDataModule.settings.multipliers.cohort.multiplier )
      }
      periodValue = periodValue * multiplierCohort

    }else{
      // Does Churn?
      cohortDataModule.updateChurnRange( customerSettings.cohortId )
      var churnRate = cohortDataModule.randomWithinRange( cohortDataModule.settings.churnByPeriods[ customerSettings.cohortId ] )
      var churnTest = Math.random() * 100
      // console.log( churnTest, '<=', churnRate )
      if( churnTest <= churnRate ){
        // console.log( 'churns' )
        isChurned = true
      }

      // Only calculate values when no churn
      if( isChurned ){
        return
      }

      if( multiplierUsed !== 1 ){
        periodValue = periodValue - periodValuePrevious
        multiplierUsed = 1
      }


      var valueGrowth = cohortDataModule.randomWithinRange( cohortDataModule.settings.values.expansion )

      // Apply Multiplier
      if( valueGrowth > 1 ){
        isPeriodSpecial = false

        // By Period
        if( periodId === cohortDataModule.settings.multipliers.relativePeriod.id ){
          isPeriodSpecial = true
          multiplierPeriodRelative = cohortDataModule.randomWithinRange( cohortDataModule.settings.multipliers.relativePeriod.multiplier )
        }

        // By Absolute Period
        if( periodMoment.format( 'YYYY-MM-DD' ) === cohortDataModule.settings.multipliers.absolutePeriod.id ){
          isPeriodSpecial = true
          multiplierPeriodAbsolute = cohortDataModule.randomWithinRange( cohortDataModule.settings.multipliers.absolutePeriod.multiplier )
        }

        if( isPeriodSpecial ){
          multiplierUsed = multiplierPeriodRelative * multiplierPeriodRelative
          valueGrowth = valueGrowth * multiplierUsed
        }

      }

      periodValue = periodValuePrevious * ( 1 + ( valueGrowth / 100 ) )
    }


    periodValue = Math.round( periodValue )
    periodChange = periodValue - periodValuePrevious


    periodValuePrevious = periodValue

    cohortDataModule.dataset.push( {
      customerId: customerSettings.customerId,
      periodId: periodMoment.format( 'YYYY-MM-DD' ),
      value: periodValue
    })
    // console.log( customerSettings.customerId, periodMoment.format( 'YYYY-MM-DD' ), periodValue )

    periodMoment.add( 1, 'month' )
  }
}


cohortDataModule.extractDataset = function(){
  var datasetRows = []
  cohortDataModule.dataset.forEach( function( datarow ){
    datasetRows.push( [ datarow.customerId.toString(), datarow.periodId, datarow.value ].join( ',' ) )
  } )

  console.log( datasetRows.join( '\n' ) )
}
// Extract: comma separated
