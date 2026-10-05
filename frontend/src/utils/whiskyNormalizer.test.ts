import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { WHISKY_IMAGE_SRC_ROOT, normalizeImageUrl } from './whiskyNormalizer.ts'

describe('normalizeImageUrl', () => {
  it('uses the first letter of the file name as the folder', () => {
    assert.equal(
      normalizeImageUrl('Material70/Yoichi-1988.jpg'),
      `${WHISKY_IMAGE_SRC_ROOT}Y/Yoichi-1988.jpg`,
    )
  })

  it('uppercases the folder for lowercase file names, keeping the file name as is', () => {
    assert.equal(
      normalizeImageUrl('Material81/trinidad-distillers-limited-13-yo.jpg'),
      `${WHISKY_IMAGE_SRC_ROOT}T/trinidad-distillers-limited-13-yo.jpg`,
    )
  })

  it('leaves digit and symbol folders unchanged', () => {
    assert.equal(normalizeImageUrl('Material1/1988-cask.jpg'), `${WHISKY_IMAGE_SRC_ROOT}1/1988-cask.jpg`)
    assert.equal(normalizeImageUrl('Material1/_old.jpg'), `${WHISKY_IMAGE_SRC_ROOT}_/_old.jpg`)
  })

  it('returns undefined for missing or malformed paths', () => {
    assert.equal(normalizeImageUrl(undefined), undefined)
    assert.equal(normalizeImageUrl(''), undefined)
    assert.equal(normalizeImageUrl('no-folder.jpg'), undefined)
  })
})
