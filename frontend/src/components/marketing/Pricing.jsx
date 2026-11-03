// "How pricing works" for the public pages: free to join, families pay the tutor's
// rate plus a booking fee, tutors keep 100%, the community is free.
// The fee comes from the booking dialog, so the site and the app always agree.
import { useState } from 'react'
import { BOOKING_FEE_PERCENT } from '../../lib/site'
import { Icon } from '../ui'
import { formatMoney } from '../../lib/format'

export const FEE = BOOKING_FEE_PERCENT

// Same rounding as the booking dialog: whole pence
const feeFor = (amount) => Math.round(amount * FEE) / 100

export function FeeCalculator() {
  const [rate, setRate] = useState(20)
  const fee = feeFor(rate)

  return (
    <div className="mk-calc">
      <div className="mk-calc-head">
        <span>Try it</span>
        <span className="mk-calc-hint">One-hour session</span>
      </div>
      <label className="mk-calc-rate" htmlFor="mk-rate">
        <span>Your tutor's rate</span>
        <b>{formatMoney(rate)}<small>/ hour</small></b>
      </label>
      <input
        id="mk-rate"
        className="mk-range"
        type="range"
        min="10"
        max="60"
        step="1"
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
      />
      <dl className="mk-calc-lines">
        <div><dt>To your tutor</dt><dd>{formatMoney(rate, { decimals: 2 })}</dd></div>
        <div><dt>Booking fee ({FEE}%)</dt><dd>{formatMoney(fee, { decimals: 2 })}</dd></div>
        <div className="is-total"><dt>You pay</dt><dd>{formatMoney(rate + fee, { decimals: 2 })}</dd></div>
      </dl>
      <p className="mk-calc-keep"><Icon name="check_circle" />Your tutor keeps 100% of their rate.</p>
    </div>
  )
}

/** Steps, the free community and the calculator, side by side. */
export function PricingExplainer() {
  return (
    <div className="mk-pricing">
      <div>
        <ol className="mk-numbered mk-price-steps">
          <li>
            <span className="mk-num" aria-hidden="true">1</span>
            <div><b>Your tutor sets their rate</b><p>Every tutor chooses their own hourly price.</p></div>
          </li>
          <li>
            <span className="mk-num" aria-hidden="true">2</span>
            <div><b>You pay the rate plus {FEE}%</b><p>A small booking fee, shown before you pay. It's how we keep the site running.</p></div>
          </li>
          <li>
            <span className="mk-num" aria-hidden="true">3</span>
            <div><b>Your tutor keeps 100%</b><p>We never take a cut of a tutor's rate.</p></div>
          </li>
        </ol>
        <p className="mk-free">
          <Icon name="groups" />
          <span><b>The community is free.</b> The forum, study notes, study rooms and live classes are free for every member.</span>
        </p>
      </div>
      <FeeCalculator />
    </div>
  )
}
