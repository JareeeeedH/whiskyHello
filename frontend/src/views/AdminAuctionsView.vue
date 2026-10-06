<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useRouter } from 'vue-router'
import {
  AdminApiError,
  cancelAdminAuction,
  createAdminAuction,
  deleteAdminAuction,
  fetchAdminAuctions,
  startAdminAuction,
  updateAdminAuction,
} from '../services/adminService'
import type {
  AdminAuction,
  AuctionFormPayload,
  AuctionStatus,
  AuctionStatusChange,
} from '../types/admin'

const CANCELLABLE_STATUSES: AuctionStatus[] = ['draft', 'scheduled', 'active']
const STATUS_FILTERS: Array<AuctionStatus | 'all'> = ['all', 'draft', 'scheduled', 'active', 'ended', 'cancelled']

const router = useRouter()
const auctions = ref<AdminAuction[]>([])
const statusFilter = ref<AuctionStatus | 'all'>('all')
const filteredAuctions = computed(() =>
  statusFilter.value === 'all'
    ? auctions.value
    : auctions.value.filter((auction) => auction.status === statusFilter.value),
)

function countByStatus(status: AuctionStatus | 'all'): number {
  return status === 'all'
    ? auctions.value.length
    : auctions.value.filter((auction) => auction.status === status).length
}
const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const startingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const rowBusy = computed(() => startingId.value !== null || deletingId.value !== null)

const cancelTarget = ref<AdminAuction | null>(null)
const cancelVisible = ref(false)
const cancelMessage = ref('')
const cancelSubmitting = ref(false)
const cancelError = ref('')

const modalVisible = ref(false)
const editingId = ref<string | null>(null)
const submitting = ref(false)
const formError = ref('')
const formWhiskyId = ref('')
const formTitle = ref('')
const formDescription = ref('')
const formStartingPrice = ref<number | null>(null)
const formStartAt = ref('')
const formEndAt = ref('')

const isEditing = computed(() => editingId.value !== null)

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat().format(value)
}

/** `datetime-local` inputs expect local time without a timezone suffix. */
function toLocalInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoString(localValue: string): string | null {
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function loadAuctions() {
  loading.value = true
  errorMessage.value = ''
  try {
    auctions.value = await fetchAdminAuctions()
  } catch {
    auctions.value = []
    errorMessage.value = 'Unable to load auctions. Please try again.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  formWhiskyId.value = ''
  formTitle.value = ''
  formDescription.value = ''
  formStartingPrice.value = null
  formStartAt.value = ''
  formEndAt.value = ''
  formError.value = ''
}

function openCreate() {
  resetForm()
  modalVisible.value = true
}

function openEdit(auction: AdminAuction) {
  if (auction.status !== 'draft') {
    return
  }
  editingId.value = auction.id
  formWhiskyId.value = auction.whiskyId
  formTitle.value = auction.title
  formDescription.value = auction.description
  formStartingPrice.value = auction.startingPrice
  formStartAt.value = toLocalInputValue(auction.startAt)
  formEndAt.value = toLocalInputValue(auction.endAt)
  formError.value = ''
  modalVisible.value = true
}

function closeModal() {
  if (submitting.value) {
    return
  }
  modalVisible.value = false
  resetForm()
}

function buildPayload(): AuctionFormPayload | string {
  const whiskyId = formWhiskyId.value.trim()
  const title = formTitle.value.trim()
  const startingPrice = formStartingPrice.value
  const startAt = toIsoString(formStartAt.value)
  const endAt = toIsoString(formEndAt.value)

  if (!whiskyId) return 'Whisky id is required'
  if (!title) return 'Title is required'
  if (startingPrice === null || startingPrice < 0) {
    return 'Starting price must be at least 0'
  }
  if (!startAt) return 'Start time is required'
  if (!endAt) return 'End time is required'

  return {
    whiskyId,
    title,
    description: formDescription.value.trim(),
    startingPrice,
    startAt,
    endAt,
  }
}

async function submitAuction() {
  if (submitting.value) {
    return
  }

  formError.value = ''
  const payload = buildPayload()
  if (typeof payload === 'string') {
    formError.value = payload
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      const updated = await updateAdminAuction(editingId.value, payload)
      auctions.value = auctions.value.map((item) =>
        item.id === updated.id ? updated : item,
      )
    } else {
      const created = await createAdminAuction(payload)
      auctions.value = [created, ...auctions.value]
    }
    modalVisible.value = false
    resetForm()
  } catch (error) {
    if (error instanceof AdminApiError && error.details.length > 0) {
      formError.value = error.details.join('; ')
    } else if (error instanceof AdminApiError) {
      formError.value = error.message
    } else {
      formError.value = 'Unable to save auction. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

async function onStart(auction: AdminAuction) {
  if (auction.status !== 'draft' || startingId.value) {
    return
  }
  if (
    !window.confirm(
      `Start "${auction.title}"? It becomes scheduled (before Start At) or active, and can no longer be edited.`,
    )
  ) {
    return
  }

  actionError.value = ''
  startingId.value = auction.id
  try {
    const started = await startAdminAuction(auction.id)
    auctions.value = auctions.value.map((item) =>
      item.id === started.id ? started : item,
    )
  } catch (error) {
    actionError.value =
      error instanceof AdminApiError
        ? [error.message, ...error.details].join(': ')
        : 'Unable to start auction. Please try again.'
  } finally {
    startingId.value = null
  }
}

async function onDelete(auction: AdminAuction) {
  if (rowBusy.value) {
    return
  }
  if (
    !window.confirm(
      `Delete "${auction.title}" (${auction.status})? The auction and all of its bids will be permanently deleted. This cannot be undone.`,
    )
  ) {
    return
  }

  actionError.value = ''
  deletingId.value = auction.id
  try {
    await deleteAdminAuction(auction.id)
    auctions.value = auctions.value.filter((item) => item.id !== auction.id)
  } catch (error) {
    actionError.value =
      error instanceof AdminApiError
        ? [error.message, ...error.details].join(': ')
        : 'Unable to delete auction. Please try again.'
  } finally {
    deletingId.value = null
  }
}

function canCancel(auction: AdminAuction): boolean {
  return CANCELLABLE_STATUSES.includes(auction.status)
}

function lastStatusChange(auction: AdminAuction): AuctionStatusChange | null {
  const history = auction.statusHistory ?? []
  return history.length > 0 ? history[history.length - 1] : null
}

function openCancel(auction: AdminAuction) {
  if (!canCancel(auction)) {
    return
  }
  cancelTarget.value = auction
  cancelMessage.value = ''
  cancelError.value = ''
  cancelVisible.value = true
}

function closeCancel() {
  if (cancelSubmitting.value) {
    return
  }
  cancelVisible.value = false
  cancelTarget.value = null
  cancelMessage.value = ''
  cancelError.value = ''
}

async function submitCancel() {
  const target = cancelTarget.value
  if (!target || cancelSubmitting.value) {
    return
  }

  const message = cancelMessage.value.trim()
  if (!message) {
    cancelError.value = 'Status change message is required'
    return
  }

  cancelError.value = ''
  cancelSubmitting.value = true
  try {
    const cancelled = await cancelAdminAuction(target.id, message)
    auctions.value = auctions.value.map((item) =>
      item.id === cancelled.id ? cancelled : item,
    )
    cancelSubmitting.value = false
    closeCancel()
  } catch (error) {
    if (error instanceof AdminApiError && error.details.length > 0) {
      cancelError.value = error.details.join('; ')
    } else if (error instanceof AdminApiError) {
      cancelError.value = error.message
    } else {
      cancelError.value = 'Unable to cancel auction. Please try again.'
    }
  } finally {
    cancelSubmitting.value = false
  }
}

onMounted(() => {
  void loadAuctions()
})
</script>

<template>
  <main class="admin-auctions">
    <header class="page-intro">
      <div class="intro-row">
        <div>
          <h1>Auction Management</h1>
          <p class="page-sub">
            Create drafts, edit drafts, start, cancel and delete auctions.
          </p>
        </div>
        <div class="intro-actions">
          <Button
            label="Back"
            severity="secondary"
            text
            @click="router.push('/admin')"
          />
          <Button label="New Auction" @click="openCreate" />
        </div>
      </div>
    </header>

    <Card class="auctions-panel" :pt="{ body: { class: 'auctions-body' } }">
      <template #content>
        <div v-if="loading" class="state" role="status">Loading auctions…</div>

        <div v-else-if="errorMessage" class="state state-error" role="alert">
          <p>{{ errorMessage }}</p>
          <Button label="Retry" severity="secondary" @click="loadAuctions" />
        </div>

        <div v-else-if="auctions.length === 0" class="state">
          No auctions yet.
        </div>

        <template v-else>
          <p v-if="actionError" class="action-error" role="alert">
            {{ actionError }}
          </p>

          <div class="status-tabs" role="tablist" aria-label="Filter by status">
            <button
              v-for="status in STATUS_FILTERS"
              :key="status"
              type="button"
              role="tab"
              class="status-tab"
              :class="{ 'is-selected': statusFilter === status }"
              :aria-selected="statusFilter === status"
              @click="statusFilter = status"
            >
              {{ status }}
              <span class="status-tab-count">{{ countByStatus(status) }}</span>
            </button>
          </div>

          <p v-if="filteredAuctions.length === 0" class="state">
            No {{ statusFilter }} auctions.
          </p>

          <ul v-else class="auction-list" aria-label="Auctions">
            <li v-for="auction in filteredAuctions" :key="auction.id" class="auction-row">
              <div class="auction-meta">
                <div class="auction-top">
                  <span class="auction-title">{{ auction.title }}</span>
                  <span
                    class="status-badge"
                    :class="`is-${auction.status}`"
                  >
                    {{ auction.status }}
                  </span>
                </div>
                <p class="auction-line">
                  Whisky {{ auction.whiskyId }} · Starting
                  {{ formatPrice(auction.startingPrice) }} ·
                  {{ formatDateTime(auction.startAt) }} →
                  {{ formatDateTime(auction.endAt) }}
                </p>
                <p
                  v-if="lastStatusChange(auction)"
                  class="status-change"
                  :title="lastStatusChange(auction)!.message"
                >
                  Last status change ·
                  <span class="status-change-status">
                    {{ lastStatusChange(auction)!.status }}
                  </span>
                  · {{ formatDateTime(lastStatusChange(auction)!.changedAt) }}
                  <span class="status-change-message">
                    “{{ lastStatusChange(auction)!.message }}”
                  </span>
                </p>
              </div>

              <div class="auction-actions">
                <template v-if="auction.status === 'draft'">
                  <Button
                    label="Edit"
                    severity="secondary"
                    text
                    size="small"
                    :disabled="rowBusy"
                    @click="openEdit(auction)"
                  />
                  <Button
                    label="Start"
                    size="small"
                    :loading="startingId === auction.id"
                    :disabled="rowBusy && startingId !== auction.id"
                    @click="onStart(auction)"
                  />
                </template>
                <Button
                  v-if="canCancel(auction)"
                  label="Cancel Auction"
                  severity="danger"
                  text
                  size="small"
                  :disabled="rowBusy"
                  @click="openCancel(auction)"
                />
                <Button
                  label="Delete"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  size="small"
                  :loading="deletingId === auction.id"
                  :disabled="rowBusy && deletingId !== auction.id"
                  @click="onDelete(auction)"
                />
              </div>
            </li>
          </ul>
        </template>
      </template>
    </Card>

    <Dialog
      v-model:visible="modalVisible"
      modal
      :draggable="false"
      :header="isEditing ? 'Edit Draft Auction' : 'New Auction'"
      :style="{ width: 'min(94vw, 520px)' }"
      :closable="!submitting"
      :dismissable-mask="!submitting"
      @hide="closeModal"
    >
      <form id="auction-form" class="auction-form" @submit.prevent="submitAuction">
        <label class="field-label" for="auction-whisky-id">Whisky ID</label>
        <InputText
          id="auction-whisky-id"
          v-model="formWhiskyId"
          class="field"
          :disabled="submitting"
        />

        <label class="field-label" for="auction-title">Title</label>
        <InputText
          id="auction-title"
          v-model="formTitle"
          class="field"
          :disabled="submitting"
        />

        <label class="field-label" for="auction-description">
          Description (optional)
        </label>
        <Textarea
          id="auction-description"
          v-model="formDescription"
          class="field"
          rows="3"
          auto-resize
          :disabled="submitting"
        />

        <label class="field-label" for="auction-starting-price">
          Starting Price
        </label>
        <InputNumber
          v-model="formStartingPrice"
          input-id="auction-starting-price"
          fluid
          :min="0"
          :disabled="submitting"
        />

        <label class="field-label" for="auction-start-at">Start At</label>
        <InputText
          id="auction-start-at"
          v-model="formStartAt"
          type="datetime-local"
          class="field"
          :disabled="submitting"
        />

        <label class="field-label" for="auction-end-at">End At</label>
        <InputText
          id="auction-end-at"
          v-model="formEndAt"
          type="datetime-local"
          class="field"
          :disabled="submitting"
        />

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      </form>

      <template #footer>
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          text
          :disabled="submitting"
          @click="closeModal"
        />
        <Button
          type="submit"
          form="auction-form"
          :label="isEditing ? 'Save' : 'Create Draft'"
          :loading="submitting"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="cancelVisible"
      modal
      :draggable="false"
      header="Cancel Auction"
      :style="{ width: 'min(94vw, 480px)' }"
      :closable="!cancelSubmitting"
      :dismissable-mask="!cancelSubmitting"
      @hide="closeCancel"
    >
      <form id="cancel-form" class="auction-form" @submit.prevent="submitCancel">
        <p v-if="cancelTarget" class="cancel-intro">
          Cancel “{{ cancelTarget.title }}” ({{ cancelTarget.status }})? The
          status becomes cancelled and cannot be changed back.
        </p>
        <label class="field-label" for="cancel-message">
          Status change message
        </label>
        <Textarea
          id="cancel-message"
          v-model="cancelMessage"
          class="field"
          rows="3"
          auto-resize
          maxlength="500"
          :disabled="cancelSubmitting"
        />
        <p v-if="cancelError" class="form-error" role="alert">{{ cancelError }}</p>
      </form>

      <template #footer>
        <Button
          type="button"
          label="Back"
          severity="secondary"
          text
          :disabled="cancelSubmitting"
          @click="closeCancel"
        />
        <Button
          type="submit"
          form="cancel-form"
          label="Cancel Auction"
          severity="danger"
          :loading="cancelSubmitting"
        />
      </template>
    </Dialog>
  </main>
</template>

<style scoped>
.admin-auctions {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.5rem;
}

.intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.intro-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.25;
  color: #1c1917;
}

.page-sub {
  margin: 0;
  font-family: var(--font-body);
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1.55;
  font-weight: 400;
}

.auctions-panel {
  border: 1px solid #f0eeeb;
  background: #fff;
  box-shadow: none;
}

:deep(.auctions-body) {
  padding-top: 0.25rem;
}

.state {
  padding: 1.25rem 0.25rem;
  color: #78716c;
  font-size: 0.95rem;
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  color: #b91c1c;
}

.state-error p {
  margin: 0;
}

.action-error,
.form-error {
  margin: 0 0 0.75rem;
  color: #b91c1c;
  font-size: 0.88rem;
  line-height: 1.45;
}

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #f0eeeb;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
  color: #78716c;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
}

.status-tab:hover {
  color: #292524;
  background: #fafaf9;
}

.status-tab.is-selected {
  border-color: #d6d3d1;
  color: #1c1917;
  background: #f5f5f4;
}

.status-tab-count {
  color: #a8a29e;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.auction-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.auction-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.95rem;
  padding: 0.6rem 0.15rem;
  border-bottom: 1px solid #f5f5f4;
}

.auction-row:last-child {
  border-bottom: none;
}

.auction-meta {
  min-width: 0;
  flex: 1;
  font-family: var(--font-body);
}

.auction-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
}

.auction-title {
  font-weight: 600;
  word-break: break-word;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.35rem;
  color: #78716c;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-badge.is-draft {
  border-color: rgba(217, 119, 6, 0.35);
  color: #b45309;
  background: #fffbeb;
}

.status-badge.is-active {
  border-color: rgba(21, 128, 61, 0.3);
  color: #15803d;
  background: #f0fdf4;
}

.status-badge.is-scheduled {
  border-color: rgba(37, 99, 235, 0.3);
  color: #1d4ed8;
  background: #eff6ff;
}

.status-badge.is-cancelled {
  border-color: rgba(185, 28, 28, 0.3);
  color: #b91c1c;
  background: #fef2f2;
}

.status-change {
  margin: 0.15rem 0 0;
  overflow: hidden;
  color: #78716c;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-change-status {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-change-message {
  color: #44403c;
}

.cancel-intro {
  margin: 0 0 0.5rem;
  color: #44403c;
  font-size: 0.9rem;
  line-height: 1.5;
}

.auction-line {
  margin: 0.15rem 0 0;
  color: #a8a29e;
  font-size: 0.82rem;
  line-height: 1.4;
  word-break: break-word;
}

.auction-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.auction-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  margin-top: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  color: #44403c;
}

.field-label:first-child {
  margin-top: 0;
}

.field {
  width: 100%;
}

.auction-form .form-error {
  margin: 0.75rem 0 0;
}

@media (max-width: 480px) {
  .intro-row,
  .auction-row {
    flex-direction: column;
    align-items: stretch;
  }

  .intro-actions,
  .auction-actions {
    justify-content: flex-end;
  }
}
</style>
