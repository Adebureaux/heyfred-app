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
          The more detail you give, the better our AI can pick the right source and find the
          right people.
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
          <div class="text-subtitle1 q-mb-md">Your ideal prospect</div>

          <q-select
            v-model="form.targetIndustries"
            label="Target industries"
            hint="Type one and press Enter. E.g. SaaS, Fintech, Healthcare"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            :rules="[(val) => (val && val.length > 0) || 'At least one industry required']"
          />

          <div class="row q-col-gutter-md q-mt-none">
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
            hint="Type one and press Enter. E.g. Paris, France"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add-unique"
            class="q-mt-md"
            :rules="[(val) => (val && val.length > 0) || 'At least one location required']"
          />

          <q-select
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
import { defineComponent, reactive, ref } from "vue";
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

export default defineComponent({
  name: "NewScrapingListPage",
  setup() {
    const router = useRouter();
    const loading = ref(false);

    const form = reactive({
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
    });

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
          name: form.name,
          offerDescription: form.offerDescription,
          valueProposition: form.valueProposition || undefined,
          targetIndustries: form.targetIndustries,
          targetCompanySizeMin: form.targetCompanySizeMin || undefined,
          targetCompanySizeMax: form.targetCompanySizeMax || undefined,
          targetLocations: form.targetLocations,
          targetJobTitles: form.targetJobTitles,
          additionalCriteria: form.additionalCriteria || undefined,
          exclusions: form.exclusions || undefined,
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

    return { form, loading, filteredTitles, filterTitles, onSubmit };
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
</style>
