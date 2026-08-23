-- 技能证书由单图改为最多九图，新增 JSON 数组列存全部地址。
-- 旧列 skill_cert_url 保留，继续存首张，供未升级的旧客户端读取。
ALTER TABLE `workers` ADD COLUMN `skill_cert_urls` JSON NULL;
