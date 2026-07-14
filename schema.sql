-- SQL Schema cho Hệ thống Trắc nghiệm Nội bộ (Supabase PostgreSQL)
-- Chạy script này trong mục SQL Editor của trang quản trị Supabase.

-- 1. Tạo bảng cấu hình Người dùng (Users)
CREATE TABLE IF NOT EXISTS public.users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tạo bảng Ngân hàng Câu hỏi (Questions)
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Mảng JSON chứa các đáp án ví dụ: ["A", "B", "C"]
    "correctIndex" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tạo bảng Lịch sử Nộp bài (Submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    detail JSONB NOT NULL, -- Mảng JSON chứa chi tiết đáp án đã trả lời
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Vô hiệu hóa Row Level Security (RLS) để Client có thể gọi trực tiếp bằng anon key
-- Lưu ý: Phù hợp cho dự án nội bộ nhanh, đơn giản.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
