ALTER TABLE "app"."exercises" ADD COLUMN "video_file_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD COLUMN "video_format" varchar(8);--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD COLUMN "video_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD CONSTRAINT "exercises_video_complete_check" CHECK (("app"."exercises"."video_file_id" is null) = ("app"."exercises"."video_format" is null) and ("app"."exercises"."video_file_id" is null) = ("app"."exercises"."video_size_bytes" is null));--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD CONSTRAINT "exercises_video_format_check" CHECK ("app"."exercises"."video_format" in ('mp4', 'mov'));