<template>
  <h1>{{ t('jobs.title') }}</h1>
  <div class="jobs">
    <form class="pure-form pure-form-stacked">
      <div class="job-row" v-for="job in allJobs" :key="job.job.name">
        <fieldset class="job-name">
          <legend>{{ t('jobs.name.' + job.job.name) }}</legend>
        </fieldset>

        <div class="attributes form-section">
          <!--          <div class="form-section-title">{{ t('jobs.attributes') }}</div>-->
          <div
            class="attribute"
            v-for="attribute in job.job.requiredContextAttributes"
            :key="attribute"
          >
            <div class="form-row">
              <label
                :for="`job-${job.job.name}-${attribute}`"
                :class="{
                  'attribute-label': true,
                  'required-field': !job.selections[attribute].valid
                }"
              >
                {{ t('selections.params.' + job.job.name + '.' + attribute) }}
              </label>

              <div class="attribute-input">
                <component
                  :is="resolveComponent(attribute)"
                  :id="`job-${job.job.name}-${attribute}`"
                  v-model="job.selections[attribute].value"
                  @validated="(valid: boolean) => onValidated(job, attribute, valid)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="launch">
          <button
            :disabled="!job.ready || job.busy"
            class="pure-button"
            type="submit"
            value="create"
            @click.prevent="launch(job)"
          >
            {{ t('jobs.launch', { name: t('jobs.name.' + job.job.name) }) }}
          </button>
        </div>
        <div class="launch-status">
          <span v-if="job.busy">
            {{ t('jobs.busy', { name: t('jobs.name.' + job.job.name) }) }}
          </span>
          <span v-if="job.done && job.success">
            {{ t('jobs.done', { name: t('jobs.name.' + job.job.name) }) }}
          </span>
          <span v-if="job.done && !job.success">
            {{ t('jobs.failed', { name: t('jobs.name.' + job.job.name) }) }}
          </span>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { Job, jobs } from '@/services'
import { onMounted, reactive, ref } from 'vue'
import PodcastsSelect from '@/podcasts/PodcastsSelect.vue'
import Input from '@/ui/Input.vue'
import { type SelectOption } from '@/ui/Select.vue'
import { useI18n } from 'vue-i18n'
import BlogsSelect from '@/blogs/BlogsSelect.vue'
import ManagedFileSelect from '@/managedfiles/ManagedFileSelect.vue'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const { t } = useI18n()

const paramComponents = new Map<string, any>()
paramComponents.set('podcastId', PodcastsSelect)
paramComponents.set('blogId', BlogsSelect)
const MANAGED_FILE_ID = 'managedFileId'
paramComponents.set(MANAGED_FILE_ID, ManagedFileSelect)

function onValidated(job: JobRequest, attribute: string, valid: boolean) {
  job.selections[attribute].valid = valid
  job.ready = Object.values(job.selections).every((v) => v != null && v.valid)
}

function resolveComponent(paramName: string): any {
  return paramComponents.get(paramName) ?? Input
}

const allJobs = ref<Array<JobRequest>>([])

function jobByName(jn: string): JobRequest | null {
  const result = allJobs.value.find((jr: JobRequest) => {
    return jr.job.name === jn
  })
  if (result) {
    return result
  }
  return null
}

class ValidatedJobParam {
  name: string
  valid: boolean
  value: SelectOption | string | number | null

  constructor(name: string, valid: boolean, value: SelectOption | string | number | null) {
    this.name = name
    this.value = value
    this.valid = valid
  }
}

async function launch(req: JobRequest) {
  const payload = new Map<string, any>()
  const valueKey = 'value'
  for (const [k, v] of Object.entries(req.selections)) {
    if (v != null && typeof v === 'object' && valueKey in v) {
      payload.set(k, v[valueKey])
    } //
    else {
      payload.set(k, v)
    }
  }

  req.busy = true
  req.done = false
  req.success = false

  return await jobs.launch(req.job.name, payload)
}

class JobRequest {
  readonly job: Job
  ready: boolean = false
  busy: boolean = false
  success: boolean = false
  done: boolean = false
  selections: Record<string, ValidatedJobParam>

  constructor(job: Job) {
    this.job = job
    this.selections = reactive({})
    // the server no longer keeps a draft execution to remember values from, so every
    // attribute starts empty. the one that used to arrive pre-filled is managedFileId,
    // and it is requested explicitly instead - see ensureManagedFile below.
    for (const attr of job.requiredContextAttributes) {
      this.selections[attr] = new ValidatedJobParam(attr, false, null)
    }
    this.ready = job.requiredContextAttributes.length === 0
  }
}

onMounted(async () => {
  // todo this needs to be fixed it doesnt work anymore.
  listenForCategory('job-stopped-event', async (evt) => {
    console.log('job-stopped-event', evt)
    const jobName = evt.key
    const job = jobByName(jobName)
    if (job) {
      job.busy = false
      job.success = JSON.parse(evt.context)['success']
      job.done = true
    }
    // todo validate
    // validate()
  })
  const jobsResults = await jobs.jobs()
  allJobs.value = await Promise.all(
    jobsResults.map(async (job) => {
      const request = new JobRequest(job)
      // a job that takes a file needs one to upload into *before* it is launched, and
      // the file selector loads it by id the moment it mounts - a null id is the NPE.
      // the server used to mint the managed file as a side effect of the jobs query,
      // back when it kept a draft execution per job; now we ask for it outright.
      if (job.requiredContextAttributes.includes(MANAGED_FILE_ID)) {
        const managedFileId = await jobs.createManagedFile(job.name)
        request.selections[MANAGED_FILE_ID] = new ValidatedJobParam(
          MANAGED_FILE_ID,
          true,
          managedFileId
        )
      }
      return request
    })
  )
  // todo call validate when the app starts
  // validate()
})
</script>

<style>
.jobs {
  .job-row {
    display: grid;
    grid-template-areas:
      ' job-name job-name job-name    '
      ' attributes attributes attributes '
      ' launch . launch-status  ';

    grid-template-columns: min-content var(--gutter-space) auto;

    padding-bottom: var(--gutter-space);

    .job-name {
      grid-area: job-name;
    }

    .attributes {
      grid-area: attributes;
      .attribute {
      }
    }

    .launch-status {
      grid-area: launch-status;
      align-self: center;
    }

    .launch {
      grid-area: launch;
    }
  }
}
</style>
