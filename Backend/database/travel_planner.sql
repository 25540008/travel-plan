SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Cơ sở dữ liệu: `travel_planner`
--
CREATE DATABASE IF NOT EXISTS `travel_planner` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `travel_planner`;
-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `destinations`
--

CREATE TABLE `destinations` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `destinations`
--

INSERT INTO `destinations` (`id`, `name`, `address`, `latitude`, `longitude`, `description`, `image_url`, `is_featured`, `created_at`) VALUES
(1, 'Đà Lạt', 'Lâm Đồng, Việt Nam', 11.9404192, 108.4583132, 'Thành phố ngàn hoa với khí hậu mát mẻ quanh năm', NULL, 1, '2026-10-19 04:38:09'),
(2, 'Hà Giang', 'Hà Giang, Việt Nam', 22.8233510, 104.9836490, 'Cao nguyên đá Đồng Văn hùng vĩ', NULL, 1, '2026-10-19 04:38:09'),
(3, 'Phú Quốc', 'Kiên Giang, Việt Nam', 10.2898790, 103.9840200, 'Đảo ngọc biển xanh cát trắng', NULL, 1, '2026-10-19 04:38:09'),
(4, 'Hội An', 'Quảng Nam, Việt Nam', 15.8800584, 108.3380469, 'Phố cổ lung linh đèn lồng', NULL, 1, '2026-10-19 04:38:09'),
(5, 'Sa Pa', 'Lào Cai, Việt Nam', 22.3363608, 103.8437852, 'Thành phố trong sương', NULL, 1, '2026-10-19 04:38:09'),
(6, 'Côn Đảo', 'Bà Rịa - Vũng Tàu, Việt Nam', 8.6832323, 106.6062755, 'Vẻ đẹp hoang sơ và tâm linh', NULL, 1, '2026-10-19 04:38:09'),
(7, 'Quy Nhơn', 'Bình Định, Việt Nam', 13.7829673, 109.2196634, 'Eo Gió, Kỳ Co tuyệt đẹp', NULL, 1, '2026-10-19 04:38:09'),
(8, 'Ninh Bình', 'Ninh Bình, Việt Nam', 20.2506149, 105.9744536, 'Di sản Tràng An - Bái Đính', NULL, 1, '2026-10-19 04:38:09'),
(9, 'Mộc Châu', 'Sơn La, Việt Nam', 20.8443487, 104.6391408, 'Đồi chè xanh mướt và mùa hoa mận', NULL, 1, '2026-10-19 04:38:09');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `category` enum('TRANSPORT','ACCOMMODATION','FOOD','SIGHTSEEING','SHOPPING','OTHER') NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `expense_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `expenses`
--

INSERT INTO `expenses` (`id`, `trip_id`, `category`, `description`, `amount`, `expense_date`, `created_at`) VALUES
(1, 1, 'TRANSPORT', 'Vé xe giường nằm khứ hồi', 700000.00, '2026-10-10', '2026-10-19 04:38:09'),
(2, 1, 'ACCOMMODATION', 'Homestay 2 đêm', 1200000.00, '2026-10-10', '2026-10-19 04:38:09'),
(3, 1, 'FOOD', 'Lẩu gà lá é & Đồ nướng', 650000.00, '2026-10-11', '2026-10-19 04:38:09');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `itinerary_items`
--

CREATE TABLE `itinerary_items` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  `activity_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `activity` varchar(200) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `note` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `itinerary_items`
--

INSERT INTO `itinerary_items` (`id`, `trip_id`, `activity_date`, `start_time`, `end_time`, `activity`, `location`, `note`, `created_at`) VALUES
(1, 1, '2026-10-10', '08:00:00', '10:00:00', 'Săn mây và uống cà phê sáng', 'Đồi Đa Phú', 'Nhớ mang áo ấm', '2026-10-19 04:38:09'),
(2, 1, '2026-10-11', '14:00:00', '17:00:00', 'Tham quan Quảng trường Lâm Viên', 'Trung tâm Đà Lạt', 'Chụp ảnh nụ hoa Atiso', '2026-10-19 04:38:09'),
(3, 1, '2026-10-12', '09:00:00', '11:30:00', 'Mua đặc sản làm quà', 'Chợ Đà Lạt', 'Mua dâu tây và mứt', '2026-10-19 04:38:09');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `trips`
--

CREATE TABLE `trips` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `destination_id` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `destination` varchar(200) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `budget` decimal(15,2) DEFAULT 0.00,
  `description` varchar(1000) DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `cover_color` varchar(30) DEFAULT 'purple',
  `is_public` tinyint(1) DEFAULT 0,
  `cloned_from_id` int(11) DEFAULT NULL,
  `ai_itinerary` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `trips`
--

INSERT INTO `trips` (`id`, `user_id`, `destination_id`, `title`, `destination`, `address`, `latitude`, `longitude`, `start_date`, `end_date`, `budget`, `description`, `cover_image`, `cover_color`, `is_public`, `cloned_from_id`, `ai_itinerary`, `created_at`) VALUES
(1, 1, 1, 'Đà Lạt chill 3N2Đ', 'Đà Lạt', 'Đà Lạt, Lâm Đồng', 11.9404192, 108.4583132, '2026-10-10', '2026-10-12', 5000000.00, 'Chuyến đi nghỉ dưỡng săn mây và thưởng thức cà phê Đà Lạt', NULL, 'purple', 1, NULL, NULL, '2026-10-19 04:38:09');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `created_at`) VALUES
(1, 'Nguyễn Văn A', 'demo@travelplan.vn', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', '2026-10-19 04:38:09');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `destinations`
--
ALTER TABLE `destinations`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_expenses_trip` (`trip_id`);

--
-- Chỉ mục cho bảng `itinerary_items`
--
ALTER TABLE `itinerary_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_itinerary_trip` (`trip_id`);

--
-- Chỉ mục cho bảng `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_trips_user` (`user_id`),
  ADD KEY `fk_trips_destination` (`destination_id`),
  ADD KEY `fk_trips_cloned` (`cloned_from_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `destinations`
--
ALTER TABLE `destinations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `itinerary_items`
--
ALTER TABLE `itinerary_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `trips`
--
ALTER TABLE `trips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expenses_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `itinerary_items`
--
ALTER TABLE `itinerary_items`
  ADD CONSTRAINT `fk_itinerary_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `trips`
--
ALTER TABLE `trips`
  ADD CONSTRAINT `fk_trips_cloned` FOREIGN KEY (`cloned_from_id`) REFERENCES `trips` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trips_destination` FOREIGN KEY (`destination_id`) REFERENCES `destinations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trips_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
