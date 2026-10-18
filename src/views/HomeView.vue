<script setup>
import { computed } from 'vue'
import { config } from '../config'
import ClockCard from '../components/ClockCard.vue'
import CustomHtml from '../components/CustomHtml.vue'
import QuoteCard from '../components/QuoteCard.vue'
import RssFeed from '../components/RssFeed.vue'
import SiteGrid from '../components/SiteGrid.vue'
import SocialLinks from '../components/SocialLinks.vue'

const { modules, profile } = config

const hasProfileInfo = computed(
  () =>
    Boolean(profile.badge || profile.greeting || profile.name || profile.subtitle || profile.skillsImage) ||
    profile.highlights.length > 0 ||
    profile.lines.length > 0,
)
</script>

<template>
  <div class="container">
    <div class="left">
      <div v-if="profile.avatar" class="avatar">
        <img :src="profile.avatar" :alt="`${config.site.name} 的头像`" />
      </div>

      <div v-if="hasProfileInfo" class="contact-info glass">
        <p v-if="profile.badge" class="badge-row">
          <img class="badge" :src="profile.badge" :alt="config.site.name" />
        </p>

        <p v-if="profile.greeting || profile.name" class="greeting">
          {{ profile.greeting }}<span v-if="profile.name" class="accent">{{ profile.name }}</span>
        </p>

        <p v-if="profile.subtitle" class="subtitle">{{ profile.subtitle }}</p>

        <p v-if="profile.highlights.length" class="highlights">
          <template v-for="(item, index) in profile.highlights" :key="item.text">
            <span class="highlight">
              <i v-if="item.icon" class="bi" :class="`bi-${item.icon}`" aria-hidden="true"></i>
              {{ item.text }}
            </span>
            <span v-if="index < profile.highlights.length - 1" class="separator">/</span>
          </template>
        </p>

        <p v-for="line in profile.lines" :key="line">{{ line }}</p>

        <p v-if="profile.skillsImage" class="skills-row">
          <img class="skills" :src="profile.skillsImage" alt="Skills and Technologies" />
        </p>
      </div>

      <SocialLinks />
    </div>

    <div class="right">
      <div v-if="modules.hitokoto || modules.clock" class="top-modules">
        <QuoteCard v-if="modules.hitokoto" />
        <ClockCard v-if="modules.clock" />
      </div>

      <RssFeed
        v-if="modules.rss.enabled && modules.rss.url"
        :url="modules.rss.url"
        :limit="modules.rss.limit"
      />

      <CustomHtml
        v-if="modules.customHtml.enabled && modules.customHtml.html"
        :html="modules.customHtml.html"
      />

      <SiteGrid v-if="config.homeSites.length" />
    </div>
  </div>
</template>

<style scoped>
.contact-info p {
  margin: 0.35rem 0;
  color: var(--text-strong);
}

.badge-row {
  margin: 0 0 0.5rem;
}

.badge {
  width: 200px;
  max-width: 100%;
  height: 25px;
  object-fit: contain;
}

.greeting {
  font-size: 24px;
  line-height: 1.35;
}

.accent {
  color: #2196f3;
  margin-left: 0.3rem;
}

.subtitle {
  font-size: 18px;
  color: #aaa;
}

.highlights {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 16px;
  color: #aaa;
}

.highlight i {
  margin-right: 2px;
}

.separator {
  color: #666;
}

.skills {
  display: block;
  width: 100%;
  /* 原版卡片只有 300 宽，窄屏堆叠后会把这条技能条放得过大 */
  max-width: 330px;
  height: auto;
  margin: 0 auto;
}
</style>
