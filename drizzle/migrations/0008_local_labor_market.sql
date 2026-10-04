CREATE TABLE "labor_market_regions" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "state_code" char(2),
  "parent_region_id" text,
  "bls_area_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "labor_market_regions" ("id", "type", "name", "state_code", "parent_region_id", "bls_area_code") VALUES
  ('US', 'national', 'United States', NULL, NULL, '99'),
  ('STATE:CA', 'state', 'California', 'CA', 'US', 'CA'),
  ('STATE:NY', 'state', 'New York', 'NY', 'US', 'NY'),
  ('STATE:TX', 'state', 'Texas', 'TX', 'US', 'TX'),
  ('STATE:WA', 'state', 'Washington', 'WA', 'US', 'WA'),
  ('METRO:31080', 'metro', 'Los Angeles-Long Beach-Anaheim, CA', 'CA', 'STATE:CA', '31080'),
  ('METRO:35620', 'metro', 'New York-Newark-Jersey City, NY-NJ', 'NY', 'STATE:NY', '35620'),
  ('METRO:41860', 'metro', 'San Francisco-Oakland-Fremont, CA', 'CA', 'STATE:CA', '41860'),
  ('METRO:42660', 'metro', 'Seattle-Tacoma-Bellevue, WA', 'WA', 'STATE:WA', '42660')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "labor_market_region_id" text DEFAULT 'US' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_labor_market_region_id_labor_market_regions_id_fk" FOREIGN KEY ("labor_market_region_id") REFERENCES "public"."labor_market_regions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "labor_market_occupation_estimates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "region_id" text NOT NULL,
  "soc_code" text NOT NULL,
  "occupation_title" text,
  "data_year" integer NOT NULL,
  "employment" integer,
  "employment_rse_tenths" integer,
  "hourly_median_wage_cents" integer,
  "annual_median_wage" integer,
  "hourly_mean_wage_cents" integer,
  "annual_mean_wage" integer,
  "source" text DEFAULT 'BLS OEWS' NOT NULL,
  "source_url" text,
  "imported_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labor_market_occupation_estimates" ADD CONSTRAINT "labor_market_occupation_estimates_region_id_labor_market_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."labor_market_regions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "labor_market_training_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "region_id" text NOT NULL,
  "onet_code" text NOT NULL,
  "provider_name" text NOT NULL,
  "program_name" text NOT NULL,
  "credential_type" text,
  "city" text,
  "state_code" char(2),
  "url" text,
  "source" text DEFAULT 'CareerOneStop cached' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labor_market_training_options" ADD CONSTRAINT "labor_market_training_options_region_id_labor_market_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."labor_market_regions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "labor_market_job_availability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "region_id" text NOT NULL,
  "onet_code" text NOT NULL,
  "active_postings" integer,
  "annual_openings" integer,
  "source" text DEFAULT 'CareerOneStop cached' NOT NULL,
  "source_url" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labor_market_job_availability" ADD CONSTRAINT "labor_market_job_availability_region_id_labor_market_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."labor_market_regions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "labor_market_regions_type_name_idx" ON "labor_market_regions" USING btree ("type","name");
--> statement-breakpoint
CREATE INDEX "labor_market_regions_parent_idx" ON "labor_market_regions" USING btree ("parent_region_id");
--> statement-breakpoint
ALTER TABLE "labor_market_occupation_estimates" ADD CONSTRAINT "labor_market_estimates_region_soc_year_unique" UNIQUE("region_id","soc_code","data_year");
--> statement-breakpoint
CREATE INDEX "labor_market_estimates_soc_region_idx" ON "labor_market_occupation_estimates" USING btree ("soc_code","region_id");
--> statement-breakpoint
CREATE INDEX "labor_market_estimates_region_year_idx" ON "labor_market_occupation_estimates" USING btree ("region_id","data_year");
--> statement-breakpoint
ALTER TABLE "labor_market_training_options" ADD CONSTRAINT "labor_market_training_region_onet_program_unique" UNIQUE("region_id","onet_code","provider_name","program_name");
--> statement-breakpoint
CREATE INDEX "labor_market_training_onet_region_idx" ON "labor_market_training_options" USING btree ("onet_code","region_id");
--> statement-breakpoint
ALTER TABLE "labor_market_job_availability" ADD CONSTRAINT "labor_market_jobs_region_onet_source_unique" UNIQUE("region_id","onet_code","source");
--> statement-breakpoint
CREATE INDEX "labor_market_jobs_onet_region_idx" ON "labor_market_job_availability" USING btree ("onet_code","region_id");
