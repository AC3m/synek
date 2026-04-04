# Module Public API Contracts

Each module exposes a single `index.ts` barrel. Consumers MUST import only from the barrel — never from internal paths. The tables below define the minimum required exports for each module's `index.ts`.

---

## `core` (not a module — imported via `~/core/...` paths)

Core is not a module with a single barrel. Consumers import from sub-paths:

| Sub-path | Exports |
|---|---|
| `~/core/components/ui/*` | shadcn primitives (unchanged) |
| `~/core/components/layout` | `Header`, `BottomNav`, `Logo`, `LanguageToggle`, `ThemeToggle`, `UserMenu`, `RoleSwitcher` |
| `~/core/components/ErrorBoundary` | `ErrorBoundary`, `useErrorBoundary` |
| `~/core/context/AuthContext` | `AuthProvider`, `useAuth` |
| `~/core/context/ThemeContext` | `ThemeProvider`, `useTheme` |
| `~/core/context/SessionActionsContext` | `SessionActionsProvider`, `useSessionActions` |
| `~/core/hooks/useLocalePath` | `useLocalePath` |
| `~/core/hooks/useIsMobile` | `useIsMobile` |
| `~/core/hooks/useAsyncAction` | `useAsyncAction` |
| `~/core/hooks/useNumericDraft` | `useNumericDraft` |
| `~/core/utils/date` | `getCurrentWeekId`, `weekIdToMonday`, `getWeekDateRange`, etc. |
| `~/core/utils/training-types` | `TRAINING_TYPE_CONFIG`, `getTrainingTypeConfig`, etc. |
| `~/core/utils/format` | `formatDuration`, `formatDistance`, etc. |
| `~/core/types/training` | `TrainingSession`, `WeekPlan`, `TrainingType`, all domain types |
| `~/core/mock-data` | `mockFetchWeekPlanByDate`, `mockFetchSessionsByWeekPlan`, etc. |
| `~/core/lib/query-keys` | `createQueryKeys` |
| `~/core/supabase` | `supabase`, `isMockMode` |
| `~/core/auth` | `signIn`, `signOut`, `getUser` |

---

## `calendar` (`~/modules/calendar`)

| Export | Type |
|---|---|
| `WeekGrid` | Component |
| `DayColumn` | Component |
| `WeekNavigation` | Component |
| `WeekSkeleton` | Component |
| `WeekSummary` | Component |
| `SportBreakdown` | Component |
| `GoalPrepBanner` | Component |
| `MultiWeekView` | Component |
| `HistoryWeekRow` | Component |
| `SessionCard` | Component |
| `StravaBulkShareBar` | Component |
| `StravaBulkSyncBar` | Component |
| `StravaActionsBar` | Component |
| `useWeekPlan` | Hook |
| `useGetOrCreateWeekPlan` | Hook |
| `useUpdateWeekPlan` | Hook |
| `useSessions` | Hook |
| `useCreateSession` | Hook |
| `useUpdateSession` | Hook |
| `useDeleteSession` | Hook |
| `useUpdateAthleteSession` | Hook |
| `useConfirmStravaSession` | Hook |
| `useBulkConfirmStravaSessions` | Hook |
| `useCopyWeekSessions` | Hook |
| `useCopyDaySessions` | Hook |
| `useCopySession` | Hook |
| `useWeekView` | Hook |
| `useWeekHistory` | Hook |
| `calendarKeys` | Query key factory instance |

---

## `training` (`~/modules/training`)

| Export | Type |
|---|---|
| `SessionForm` | Component |
| `CompletionToggle` | Component |
| `AthleteFeedback` | Component |
| `DeleteConfirmationDialog` | Component |
| `SessionIntervals` | Component |
| `IntervalChart` | Component |
| `LapTable` | Component |
| `GarminBadge` | Component |
| `GarminSection` | Component |
| `StravaSyncButton` | Component |
| `StravaConfirmButton` | Component |
| `StravaLogo` | Component |
| `RunFields` | Component |
| `CyclingFields` | Component |
| `StrengthFields` | Component |
| `RestDayFields` | Component |
| `YogaMobilityFields` | Component |
| `SwimmingFields` | Component |
| `WalkHikeFields` | Component |
| `useSessionLaps` | Hook |
| `useFeedback` | Hook |
| `useSessionFormState` | Hook |
| `useGoalDialogState` | Hook |
| `trainingKeys` | Query key factory instance |

---

## `goals` (`~/modules/goals`)

| Export | Type |
|---|---|
| `GoalCard` | Component |
| `GoalDialog` | Component |
| `GoalList` | Component |
| `GoalListView` | Component |
| `useGoals` | Hook |
| `goalsKeys` | Query key factory instance |

---

## `stats` (`~/modules/stats`)

| Export | Type |
|---|---|
| `StatsView` | Component (was `AnalyticsView`) |
| `VolumeChart` | Component |
| `PeriodSelector` | Component |
| `SportFilter` | Component |
| `useStats` | Hook (was `useAnalytics`) |
| `statsKeys` | Query key factory instance |

---

## `strength` (`~/modules/strength`)

| Export | Type |
|---|---|
| `StrengthLibraryView` | Component |
| `StrengthEmptyState` | Component |
| `StrengthStatCards` | Component |
| `VariantCard` | Component |
| `VariantPicker` | Component |
| `VariantProgressModal` | Component |
| `VariantExerciseList` | Component |
| `ExerciseProgressChart` | Component |
| `ProgressLineChart` | Component |
| `SessionHistoryTable` | Component |
| `ExerciseFilterPills` | Component |
| `DeltaIndicator` | Component |
| `StatCard` | Component |
| `StrengthVariantField` | Component |
| `CopySetButton` | Component |
| `IncrementField` | Component |
| `PrefillBadge` | Component |
| `PrevSetRow` | Component |
| `useStrengthVariants` | Hook |
| `strengthKeys` | Query key factory instance |

---

## `settings` (`~/modules/settings`)

| Export | Type |
|---|---|
| `UserTab` | Component |
| `IntegrationsTab` | Component |
| `AthletesTab` | Component |
| `DeleteAccountDialog` | Component |
| `JunctionGarminSection` | Component |
| `SettingsPage` | Component (page) |
| `useProfile` | Hook |
| `useUpdateProfileName` | Hook |
| `useUploadAvatar` | Hook |
| `useChangePassword` | Hook |
| `useSelfPlanPermission` | Hook |
| `useUpdateSelfPlanPermission` | Hook |
| `useStravaConnection` | Hook |
| `useStravaConnectionStatus` | Hook |
| `useStravaSync` | Hook |
| `useJunctionConnection` | Hook |
| `useJunctionConnectionStatus` | Hook |
| `useJunctionWeekWorkouts` | Hook |
| `useInvites` | Hook |
| `settingsKeys` | Query key factory instance |

---

## `athlete` (`~/modules/athlete`)

| Export | Type |
|---|---|
| `AthleteWeekPage` | Page component |
| `AthleteGoalsPage` | Page component |
| `AthleteStatsPage` | Page component |
| `AthleteStrengthPage` | Page component |
| `AthleteStrengthVariantPage` | Page component |

---

## `coach` (`~/modules/coach`)

| Export | Type |
|---|---|
| `CoachWeekPage` | Page component |
| `CoachGoalsPage` | Page component |
| `CoachStatsPage` | Page component |
| `CoachStrengthPage` | Page component |
| `CoachStrengthVariantPage` | Page component |
| `AthletePicker` | Component |

---

## `landing` (`~/modules/landing`)

| Export | Type |
|---|---|
| `LandingPage` | Page component |
| `meta` | RR7 meta function |
| `LandingNav` | Component |

---

## `auth` (`~/modules/auth`)

| Export | Type |
|---|---|
| `LoginPage` | Page component |
| `RegisterPage` | Page component |
| `InvitePage` | Page component |
| `meta` | RR7 meta function (covers all auth pages — or each page exports its own) |
