<template>
  <q-page>
    <router-link to="/prospects/new" class="text-back">
      <q-icon name="arrow_back" size="16px" />
      Create a list
    </router-link>

    <div class="page-heading q-mb-md">
      <div>
        <div class="eyebrow">One-off scraping</div>
        <div class="text-h5">Tell us who you're looking for</div>
        <div class="text-caption text-grey">
          The more detail you give, the more relevant the companies and people we find.
        </div>
      </div>
    </div>

    <q-form class="q-gutter-md form-card" @submit="onSubmit">
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Your offer</div>

          <q-input
            v-model="form.name"
            label="List name"
            hint="Just for you — e.g. “SaaS founders France”"
            lazy-rules
            :rules="[(val) => !!val || 'Name required']"
          />
          <q-input
            v-model="form.offerDescription"
            type="textarea"
            autogrow
            label="What does your company offer?"
            hint="Your product or service, in your own words"
            class="q-mt-md"
            lazy-rules
            :rules="[(val) => !!val || 'Required']"
          />
          <q-input
            v-model="form.valueProposition"
            type="textarea"
            autogrow
            label="Value proposition (optional)"
            hint="Why should this prospect care?"
            class="q-mt-md"
          />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 q-mb-sm">Your ideal prospect</div>

          <div class="text-caption text-grey q-mb-xs">Who are you targeting?</div>
          <q-list bordered separator class="target-types q-mb-md">
            <q-item v-for="option in targetTypeOptions" :key="option.value" tag="label">
              <q-item-section avatar>
                <q-radio v-model="form.targetType" :val="option.value" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ option.label }}</q-item-label>
                <q-item-label caption>{{ option.caption }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-select
            v-model="form.targetIndustries"
            :label="fieldCopy.industriesLabel"
            :hint="`Type one and press Enter. ${fieldCopy.industriesHint}`"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            :rules="[(val) => (val && val.length > 0) || 'At least one required']"
          />

          <div v-if="!isLocal" class="row q-col-gutter-md q-mt-none">
            <q-input
              v-model.number="form.targetCompanySizeMin"
              type="number"
              label="Company size min (optional)"
              class="col"
            />
            <q-input
              v-model.number="form.targetCompanySizeMax"
              type="number"
              label="Company size max (optional)"
              class="col"
            />
          </div>

          <q-select
            v-model="form.targetLocations"
            label="Target locations"
            :hint="`Type one and press Enter. ${fieldCopy.locationsHint}`"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            class="q-mt-md"
            :rules="[(val) => (val && val.length > 0) || 'At least one location required']"
          />

          <q-select
            v-if="!isLocal"
            v-model="form.targetJobTitles"
            label="Decision-maker titles to target"
            hint="Choose a title or type your own then press Enter"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            :options="filteredTitles"
            @filter="filterTitles"
            class="q-mt-md"
            :rules="[(val) => (val && val.length > 0) || 'At least one title required']"
          />

          <q-input
            v-model="form.additionalCriteria"
            type="textarea"
            autogrow
            label="Anything else? (optional)"
            hint="Pain points, buying signals, recent funding, tech stack…"
            class="q-mt-md"
          />
          <q-input
            v-model="form.exclusions"
            type="textarea"
            autogrow
            label="Exclusions (optional)"
            hint="Anything you want to rule out, e.g. agencies, competitors"
            class="q-mt-md"
          />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Budget</div>
          <q-input
            v-model.number="form.maxProspects"
            type="number"
            label="Number of prospects to find"
            hint="Caps how many Apify/LinkedIn lookups this run makes — higher numbers cost more credits"
            :min="1"
            :max="50"
            lazy-rules
            :rules="[(val) => (val >= 1 && val <= 50) || 'Between 1 and 50']"
          />
        </q-card-section>
      </q-card>

      <q-btn
        type="submit"
        color="primary"
        label="Find prospects"
        icon="travel_explore"
        class="full-width"
        :loading="loading"
      />
    </q-form>
  </q-page>
</template>

<script>
import { computed, defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Notify } from "quasar";
import { api } from "boot/axios";
import { extractErrorMessage } from "src/utils/error-message";

const COMMON_TITLES = [
  "CEO",
  "Founder",
  "Co-Founder",
  "COO",
  "CFO",
  "CTO",
  "CMO",
  "VP Sales",
  "VP Marketing",
  "Head of Sales",
  "Head of Marketing",
  "Head of Growth",
  "Director of Sales",
];

const TARGET_TYPE_OPTIONS = [
  {
    value: "B2B_COMPANIES",
    label: "B2B companies",
    caption: "Companies found on LinkedIn, then their decision-makers",
  },
  {
    value: "AGENCIES_FREELANCERS",
    label: "Agencies & freelancers",
    caption: "Listings from Clutch, DesignRush and Sortlist, with their contact details",
  },
  {
    value: "LOCAL_BUSINESSES",
    label: "Local businesses",
    caption: "Shops, restaurants… from Google Maps — the business itself is the contact",
  },
];

const FIELD_COPY = {
  B2B_COMPANIES: {
    industriesLabel: "Target industries",
    industriesHint: "E.g. Software Development, Insurance, Manufacturing",
    locationsHint: "E.g. France, Paris",
  },
  AGENCIES_FREELANCERS: {
    industriesLabel: "Services they offer",
    industriesHint: "E.g. web design, SEO, branding, video production",
    locationsHint: "A country, e.g. France",
  },
  LOCAL_BUSINESSES: {
    industriesLabel: "Type of business",
    industriesHint: "As you'd search it on Google Maps, e.g. restaurant, bakery, garage",
    locationsHint: "A city or area, e.g. Lyon",
  },
};

export default defineComponent({
  name: "NewScrapingListPage",
  setup() {
    const router = useRouter();
    const loading = ref(false);

    const form = reactive({
      targetType: "B2B_COMPANIES",
      name: "",
      offerDescription: "",
      valueProposition: "",
      targetIndustries: [],
      targetCompanySizeMin: null,
      targetCompanySizeMax: null,
      targetLocations: [],
      targetJobTitles: [],
      additionalCriteria: "",
      exclusions: "",
      maxProspects: 10,
    });

    const isLocal = computed(() => form.targetType === "LOCAL_BUSINESSES");
    const fieldCopy = computed(() => FIELD_COPY[form.targetType]);

    const filteredTitles = ref(COMMON_TITLES);
    function filterTitles(val, update) {
      update(() => {
        filteredTitles.value =
          val === ""
            ? COMMON_TITLES
            : COMMON_TITLES.filter((v) => v.toLowerCase().includes(val.toLowerCase()));
      });
    }

    async function onSubmit() {
      loading.value = true;
      try {
        const { data } = await api.post("/prospect-lists", {
          targetType: form.targetType,
          name: form.name,
          offerDescription: form.offerDescription,
          valueProposition: form.valueProposition || undefined,
          targetIndustries: form.targetIndustries,
          targetCompanySizeMin: isLocal.value ? undefined : form.targetCompanySizeMin || undefined,
          targetCompanySizeMax: isLocal.value ? undefined : form.targetCompanySizeMax || undefined,
          targetLocations: form.targetLocations,
          targetJobTitles: isLocal.value ? [] : form.targetJobTitles,
          additionalCriteria: form.additionalCriteria || undefined,
          exclusions: form.exclusions || undefined,
          maxProspects: form.maxProspects,
        });
        Notify.create({ type: "positive", message: "List created" });
        router.push(`/prospects/${data.id}`);
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to create list"),
        });
      } finally {
        loading.value = false;
      }
    }

    return {
      form,
      loading,
      isLocal,
      fieldCopy,
      targetTypeOptions: TARGET_TYPE_OPTIONS,
      filteredTitles,
      filterTitles,
      onSubmit,
    };
  },
});
</script>

<style scoped>
.text-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--heyfred-muted);
  font-size: 13px;
  text-decoration: none;
  margin-bottom: 18px;
}
.text-back:hover {
  color: var(--heyfred-ink);
}
.eyebrow {
  color: var(--heyfred-muted);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.form-card {
  max-width: 640px;
}
.target-types {
  border-radius: 8px;
}
</style>
