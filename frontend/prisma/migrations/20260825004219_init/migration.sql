-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "PatentStatus" AS ENUM ('uploaded', 'processing', 'analyzed', 'error');

-- CreateEnum
CREATE TYPE "PatentEntityType" AS ENUM ('person', 'org', 'date', 'monetary');

-- CreateEnum
CREATE TYPE "EmbeddingSourceSection" AS ENUM ('claims', 'abstract', 'full');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "hashed_password" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "status" "PatentStatus" NOT NULL DEFAULT 'uploaded',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patent_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "extracted_text" TEXT,
    "claims_text" TEXT,
    "abstract_text" TEXT,
    "background_text" TEXT,
    "novelty_score" DOUBLE PRECISION,
    "risk_score" DOUBLE PRECISION,
    "compliance_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patent_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patent_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "entity_type" "PatentEntityType" NOT NULL,
    "entity_value" TEXT NOT NULL,
    "span_start" INTEGER,
    "span_end" INTEGER,

    CONSTRAINT "patent_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patent_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "embedding" vector(384) NOT NULL,
    "source_section" "EmbeddingSourceSection" NOT NULL,

    CONSTRAINT "patent_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prior_art_corpus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed_dataset',
    "full_text" TEXT NOT NULL,
    "embedding" vector(384),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "prior_art_corpus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similarity_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "prior_art_id" UUID NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similarity_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "cited_prior_art_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patent_id" UUID NOT NULL,
    "report_url" TEXT,
    "sections_included" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "patents_user_id_idx" ON "patents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patent_analysis_patent_id_key" ON "patent_analysis"("patent_id");

-- CreateIndex
CREATE INDEX "patent_entities_patent_id_idx" ON "patent_entities"("patent_id");

-- CreateIndex
CREATE INDEX "patent_embeddings_patent_id_idx" ON "patent_embeddings"("patent_id");

-- CreateIndex
CREATE INDEX "similarity_results_patent_id_idx" ON "similarity_results"("patent_id");

-- CreateIndex
CREATE INDEX "similarity_results_prior_art_id_idx" ON "similarity_results"("prior_art_id");

-- CreateIndex
CREATE INDEX "chat_messages_patent_id_idx" ON "chat_messages"("patent_id");

-- AddForeignKey
ALTER TABLE "patents" ADD CONSTRAINT "patents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patent_analysis" ADD CONSTRAINT "patent_analysis_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patent_entities" ADD CONSTRAINT "patent_entities_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patent_embeddings" ADD CONSTRAINT "patent_embeddings_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_results" ADD CONSTRAINT "similarity_results_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_results" ADD CONSTRAINT "similarity_results_prior_art_id_fkey" FOREIGN KEY ("prior_art_id") REFERENCES "prior_art_corpus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_patent_id_fkey" FOREIGN KEY ("patent_id") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateIndex (manual: Prisma treats `vector` columns as Unsupported and
-- won't manage these; cosine ops match the <=> operator used for similarity search)
CREATE INDEX "patent_embeddings_embedding_hnsw_idx" ON "patent_embeddings" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "prior_art_corpus_embedding_hnsw_idx" ON "prior_art_corpus" USING hnsw ("embedding" vector_cosine_ops);
