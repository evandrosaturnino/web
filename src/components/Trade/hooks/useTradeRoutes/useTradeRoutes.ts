import { Asset, ChainTypes, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { selectAssetByCAIP19, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TradeState } from '../../Trade'
import { TradeActions, useSwapper } from '../useSwapper/useSwapper'

export const useTradeRoutes = (
  assetId: string
): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<ChainTypes, SwapperType>>()
  const { getQuote, getBestSwapper, getDefaultPair } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')
  const assets = useSelector(selectAssets)
  const feeAsset = assets['eip155:1/slip44:60']
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const setDefaultAssets = useCallback(async () => {
    try {
      const [sellAssetId, buyAssetId] = getDefaultPair()
      const sellAsset = assets[sellAssetId]
      // TODO: this is fine for now, since we can only trade ETH/ERC20
      // but should be refactored to adequate incoming new chains - i.e. thorchain swaps
      const buyAsset =
        asset?.chain === 'ethereum' && asset?.caip19 !== sellAssetId
          ? assets[asset.caip19]
          : assets[buyAssetId]
      if (sellAsset && buyAsset) {
        await getBestSwapper({
          sellAsset: { currency: sellAsset },
          buyAsset: { currency: buyAsset }
        })
        setValue('sellAsset.currency', sellAsset)
        setValue('buyAsset.currency', buyAsset)
        getQuote({
          amount: '0',
          sellAsset: { currency: sellAsset },
          buyAsset: { currency: buyAsset },
          feeAsset
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [asset, assets, setValue, feeAsset, getQuote, getDefaultPair, getBestSwapper])

  useEffect(() => {
    setDefaultAssets()
  }, [asset]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        if (buyAsset.currency && asset.caip19 === buyAsset.currency.caip19)
          setValue('buyAsset.currency', sellAsset.currency)
        const action = buyAsset.amount ? TradeActions.SELL : undefined
        setValue('sellAsset.currency', asset)
        setValue('buyAsset.amount', '')
        setValue('action', action)
        setValue('quote', undefined)
        await getBestSwapper({ sellAsset, buyAsset })
        getQuote({
          amount: sellAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, getBestSwapper, getQuote]
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        if (sellAsset.currency && asset.caip19 === sellAsset.currency.caip19)
          setValue('sellAsset.currency', buyAsset.currency)
        const action = sellAsset.amount ? TradeActions.BUY : undefined
        setValue('buyAsset.currency', asset)
        setValue('sellAsset.amount', '')
        setValue('action', action)
        setValue('quote', undefined)
        await getBestSwapper({ sellAsset, buyAsset })
        getQuote({
          amount: buyAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, getBestSwapper, getQuote]
  )

  return { handleSellClick, handleBuyClick }
}
