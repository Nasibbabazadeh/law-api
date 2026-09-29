CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"locale" text DEFAULT 'az' NOT NULL,
	"timezone" text DEFAULT 'Asia/Baku' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('student', 'teacher'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text COLLATE "az-x-icu" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "field_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "law_article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"number" text NOT NULL,
	"version" text NOT NULL,
	"text" text NOT NULL,
	"source_url" text,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "law_article_code_number_version_unique" UNIQUE("code","number","version")
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"difficulty" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "question_type_check" CHECK ("question"."type" in ('single_choice', 'true_false')),
	CONSTRAINT "question_difficulty_check" CHECK ("question"."difficulty" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "question_article" (
	"question_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	CONSTRAINT "question_article_question_id_article_id_pk" PRIMARY KEY("question_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text COLLATE "az-x-icu" NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "topic_field_slug_unique" UNIQUE("field_id","slug")
);
--> statement-breakpoint
CREATE TABLE "attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"context" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"answer" text NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"study_day" date NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_context_check" CHECK ("attempt"."context" in ('quiz', 'drill', 'exam', 'review', 'group'))
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmark_user_id_target_type_target_id_pk" PRIMARY KEY("user_id","target_type","target_id"),
	CONSTRAINT "bookmark_target_type_check" CHECK ("bookmark"."target_type" in ('question', 'topic'))
);
--> statement-breakpoint
CREATE TABLE "review_item" (
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"correct_streak" integer NOT NULL,
	"due_day" date NOT NULL,
	"mastered_at" timestamp with time zone,
	"wrong_count" integer NOT NULL,
	"last_attempt_day" date NOT NULL,
	CONSTRAINT "review_item_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_article" ADD CONSTRAINT "question_article_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_article" ADD CONSTRAINT "question_article_article_id_law_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."law_article"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_field_id_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."field"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "question_topic_idx" ON "question" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "question_prompt_trgm_idx" ON "question" USING gin ("prompt" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "question_article_article_idx" ON "question_article" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "topic_field_sort_idx" ON "topic" USING btree ("field_id","sort_order");--> statement-breakpoint
CREATE INDEX "topic_name_trgm_idx" ON "topic" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "attempt_user_question_answered_idx" ON "attempt" USING btree ("user_id","question_id","answered_at");--> statement-breakpoint
CREATE INDEX "attempt_user_study_day_idx" ON "attempt" USING btree ("user_id","study_day");--> statement-breakpoint
CREATE INDEX "review_item_user_due_idx" ON "review_item" USING btree ("user_id","due_day");