// How pricing works, for the public pages: free to join, families pay the tutor's rate
// plus a booking fee, tutors keep 100%, the community is free. Three numbers and a calculator.
// The fee comes from lib/site.js, so the site and the booking dialog always agree.
import { useState } from 'react'
import { BOOKING_FEE_PERCENT } from '../../lib/site'
import { Icon } from '../ui'
import { formatMoney } from '../../lib/format'
import { Numbers } from '.'

export const FEE = BOOKING_FEE_PERCENT

// Same rounding as the booking dialog: whole pence
const feeFor = (amount) => Math.round(amount * FEE) / 100

export function FeeCalculator() {
  const [rate, setRate] = useState(20)
  const fee = feeFor(rate)

  return (
    <div className="mk-calc">
      <div className="mk-calc-head">
        <b>Try it</b>
        <span>A one-hour session</span>
      </div>
      <label className="mk-calc-rate" htmlFor="mk-rate">
        <span>Your tutor's rate</span>
        <b>{formatMoney(rate)}<small>/ hour</small></b>
      </label>
      <div className="mk-range" style={{ '--fill': (rate - 10) / 50 }}>
        <input
          id="mk-rate"
          type="range"
          min="10"
          max="60"
          step="1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>
      <dl className="mk-calc-lines">
        <div><dt>To your tutor</dt><dd>{formatMoney(rate, { decimals: 2 })}</dd></div>
        <div><dt>Booking fee ({FEE}%)</dt><dd>{formatMoney(fee, { decimals: 2 })}</dd></div>
        <div className="is-total"><dt>You pay</dt><dd>{formatMoney(rate + fee, { decimals: 2 })}</dd></div>
      </dl>
      <p className="mk-calc-keep"><Icon name="check_circle" />Your tutor keeps 100% of their rate.</p>
    </div>
  )
}

/** The model in three numbers, beside the calculator. */
export function PricingExplainer() {
  return (
    <div className="mk-pricing">
      <Numbers
        items={[
          [100, '%', 'of the rate goes to your tutor'],
          [FEE, '%', 'booking fee, shown before you pay'],
          ['£0', '', 'to join, and the community is free'],
        ]}
      />
      <div className="mk-reveal" style={{ '--i': 1 }}><FeeCalculator /></div>
    </div>
  )
}
