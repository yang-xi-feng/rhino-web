/**
 * ArcIns ImageToolkit 外部API调用示例 - JavaScript版本
 * 
 * 本脚本演示如何使用JavaScript调用ArcIns ImageToolkit的外部API接口，
 * 获取图片组和图片数据。
 * 
 * 环境要求:
 *   - Node.js 环境
 *   - 或者在支持fetch API的现代浏览器中运行
 * 
 * 使用方法:
 *   node JavaScript调用示例.js
 */

// 如果在Node.js环境中运行，需要安装node-fetch
// npm install node-fetch
// 在Node.js 18+中，fetch已经内置，无需安装

// 检查是否在Node.js环境中
const isNode = typeof window === 'undefined';

// 在Node.js环境中导入fetch（如果需要）
let fetch;
if (isNode) {
    try {
        // Node.js 18+ 内置fetch
        fetch = globalThis.fetch;
    } catch (e) {
        // 旧版本Node.js需要导入node-fetch
        try {
            fetch = require('node-fetch');
        } catch (importError) {
            console.error('请安装node-fetch: npm install node-fetch');
            process.exit(1);
        }
    }
}

/**
 * ArcIns ImageToolkit 外部API客户端类
 */
class ArcInsImageToolkitAPI {
    /**
     * 构造函数
     * @param {string} baseUrl - API基础URL
     */
    constructor(baseUrl = 'http://192.10.222.123:8001/api/v1/external') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * 发送HTTP请求
     * @param {string} method - HTTP方法
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @returns {Promise<Object>} 响应数据
     */
    async makeRequest(method, endpoint, params = null) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        
        // 添加查询参数
        if (params && method === 'GET') {
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            });
        }

        const options = {
            method,
            headers: this.defaultHeaders
        };

        try {
            const response = await fetch(url.toString(), options);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error(`请求失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取图片组列表
     * @param {number} page - 页码，从1开始
     * @param {number} size - 每页数量，最大100
     * @param {string} search - 搜索关键词
     * @returns {Promise<Object>} 图片组列表数据
     */
    async getImageGroups(page = 1, size = 20, search = null) {
        const params = { page, size };
        if (search) {
            params.search = search;
        }
        return await this.makeRequest('GET', '/image-groups', params);
    }

    /**
     * 获取图片组详情
     * @param {number} groupId - 图片组ID
     * @returns {Promise<Object>} 图片组详细信息
     */
    async getImageGroup(groupId) {
        return await this.makeRequest('GET', `/image-groups/${groupId}`);
    }

    /**
     * 获取图片组中的图片列表
     * @param {number} groupId - 图片组ID
     * @param {number} page - 页码，从1开始
     * @param {number} size - 每页数量，最大200
     * @returns {Promise<Object>} 图片列表数据
     */
    async getGroupImages(groupId, page = 1, size = 50) {
        const params = { page, size };
        return await this.makeRequest('GET', `/image-groups/${groupId}/images`, params);
    }

    /**
     * 获取单张图片详情
     * @param {number} imageId - 图片ID
     * @returns {Promise<Object>} 图片详细信息
     */
    async getImage(imageId) {
        return await this.makeRequest('GET', `/images/${imageId}`);
    }

    /**
     * 获取系统统计信息
     * @returns {Promise<Object>} 系统统计数据
     */
    async getStats() {
        return await this.makeRequest('GET', '/stats');
    }

    /**
     * 下载图片（浏览器环境中会触发下载）
     * @param {string} imageUrl - 图片URL
     * @param {string} filename - 文件名
     * @returns {Promise<boolean>} 是否成功
     */
    async downloadImage(imageUrl, filename) {
        try {
            if (isNode) {
                // Node.js环境中的下载逻辑
                const fs = require('fs');
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(`下载失败: ${response.statusText}`);
                }
                const buffer = await response.buffer();
                fs.writeFileSync(filename, buffer);
                console.log(`图片已保存到: ${filename}`);
            } else {
                // 浏览器环境中触发下载
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(`下载失败: ${response.statusText}`);
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                console.log(`开始下载: ${filename}`);
            }
            return true;
        } catch (error) {
            console.error(`下载图片失败: ${error.message}`);
            return false;
        }
    }
}

/**
 * 工具函数
 */

/**
 * 打印分隔线
 * @param {string} title - 标题
 */
function printSeparator(title) {
    console.log('\n' + '='.repeat(60));
    console.log(` ${title} `);
    console.log('='.repeat(60));
}

/**
 * 格式化文件大小
 * @param {number} sizeBytes - 文件大小（字节）
 * @returns {string} 格式化后的大小
 */
function formatFileSize(sizeBytes) {
    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    } else if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

/**
 * 格式化日期时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('zh-CN');
}

/**
 * 主函数 - 演示API调用
 */
async function main() {
    // 创建API客户端
    const api = new ArcInsImageToolkitAPI();

    try {
        // 1. 获取系统统计信息
        printSeparator('系统统计信息');
        const stats = await api.getStats();
        console.log(`API版本: ${stats.api_version}`);
        console.log(`系统描述: ${stats.description}`);
        console.log(`图片组总数: ${stats.total_groups}`);
        console.log(`图片总数: ${stats.total_images}`);

        if (stats.sources_stats && stats.sources_stats.length > 0) {
            console.log('\n来源网站统计:');
            stats.sources_stats.forEach(source => {
                console.log(`  - ${source.source}: ${source.count} 张图片`);
            });
        }

        // 2. 获取图片组列表
        printSeparator('图片组列表');
        const groupsResponse = await api.getImageGroups(1, 5);

        console.log(`总共 ${groupsResponse.total} 个图片组`);
        console.log(`当前第 ${groupsResponse.page} 页，共 ${groupsResponse.total_pages} 页`);

        if (groupsResponse.data && groupsResponse.data.length > 0) {
            console.log('\n图片组列表:');
            groupsResponse.data.forEach(group => {
                console.log(`\n  ID: ${group.id}`);
                console.log(`  名称: ${group.name}`);
                console.log(`  描述: ${group.description}`);
                console.log(`  关键词: ${group.search_keyword}`);
                console.log(`  来源: ${group.source_website}`);
                console.log(`  图片数量: ${group.image_count}`);
                console.log(`  创建时间: ${formatDateTime(group.created_at)}`);
                if (group.cover_image) {
                    console.log(`  封面图片: ${group.cover_image}`);
                }
            });
        }

        // 3. 获取第一个图片组的详细信息
        if (groupsResponse.data && groupsResponse.data.length > 0) {
            const firstGroup = groupsResponse.data[0];
            const groupId = firstGroup.id;

            printSeparator(`图片组详情 - ${firstGroup.name}`);
            const groupDetail = await api.getImageGroup(groupId);

            console.log(`图片组ID: ${groupDetail.id}`);
            console.log(`名称: ${groupDetail.name}`);
            console.log(`描述: ${groupDetail.description}`);
            console.log(`搜索关键词: ${groupDetail.search_keyword}`);
            console.log(`来源网站: ${groupDetail.source_website}`);
            console.log(`图片数量: ${groupDetail.image_count}`);
            console.log(`创建时间: ${formatDateTime(groupDetail.created_at)}`);
            console.log(`更新时间: ${formatDateTime(groupDetail.updated_at)}`);

            // 4. 获取该图片组中的图片列表
            printSeparator(`图片列表 - ${firstGroup.name}`);
            const imagesResponse = await api.getGroupImages(groupId, 1, 3);

            console.log(`该组共有 ${imagesResponse.total} 张图片`);
            console.log(`当前第 ${imagesResponse.page} 页，共 ${imagesResponse.total_pages} 页`);

            if (imagesResponse.data && imagesResponse.data.length > 0) {
                console.log('\n图片列表:');
                imagesResponse.data.forEach(image => {
                    console.log(`\n  图片ID: ${image.id}`);
                    console.log(`  文件名: ${image.filename}`);
                    console.log(`  尺寸: ${image.width} x ${image.height}`);
                    console.log(`  文件大小: ${formatFileSize(image.file_size)}`);
                    console.log(`  格式: ${image.format}`);
                    console.log(`  MinIO URL: ${image.minio_url}`);
                    console.log(`  原始URL: ${image.original_url}`);
                    console.log(`  来源网站: ${image.source_website}`);
                    console.log(`  创建时间: ${formatDateTime(image.created_at)}`);
                });

                // 5. 获取第一张图片的详细信息
                const firstImage = imagesResponse.data[0];
                const imageId = firstImage.id;

                printSeparator(`图片详情 - ${firstImage.filename}`);
                const imageDetail = await api.getImage(imageId);

                console.log(`图片ID: ${imageDetail.id}`);
                console.log(`文件名: ${imageDetail.filename}`);
                console.log(`尺寸: ${imageDetail.width} x ${imageDetail.height}`);
                console.log(`文件大小: ${formatFileSize(imageDetail.file_size)}`);
                console.log(`格式: ${imageDetail.format}`);
                console.log(`MinIO URL: ${imageDetail.minio_url}`);
                console.log(`原始URL: ${imageDetail.original_url}`);
                console.log(`来源网站: ${imageDetail.source_website}`);
                if (imageDetail.group_info) {
                    console.log(`所属图片组: ${imageDetail.group_info.name}`);
                }
                console.log(`创建时间: ${formatDateTime(imageDetail.created_at)}`);

                // 6. 演示图片下载（可选）
                printSeparator('图片下载演示');
                console.log(`图片URL: ${imageDetail.minio_url}`);
                console.log('提示: 您可以直接在浏览器中访问上述URL查看图片');
                console.log('或者使用 api.downloadImage() 方法下载到本地');

                // 取消注释下面的代码来实际下载图片
                // const downloadFilename = `downloaded_${imageDetail.filename}`;
                // const downloadSuccess = await api.downloadImage(imageDetail.minio_url, downloadFilename);
                // if (downloadSuccess) {
                //     console.log(`图片已下载: ${downloadFilename}`);
                // }
            }
        }

        // 7. 演示搜索功能
        printSeparator('搜索演示');
        const searchKeyword = '风景'; // 可以修改为其他关键词
        const searchResults = await api.getImageGroups(1, 10, searchKeyword);

        console.log(`搜索关键词: '${searchKeyword}'`);
        console.log(`找到 ${searchResults.total} 个相关图片组`);

        if (searchResults.data && searchResults.data.length > 0) {
            console.log('\n搜索结果:');
            searchResults.data.forEach(group => {
                console.log(`  - ${group.name} (${group.image_count} 张图片)`);
            });
        } else {
            console.log('未找到相关图片组');
        }

        printSeparator('演示完成');
        console.log('所有API调用演示已完成！');
        console.log('\n您可以修改本脚本中的参数来测试不同的功能：');
        console.log('- 修改页码和每页数量');
        console.log('- 修改搜索关键词');
        console.log('- 取消注释图片下载代码');
        console.log('- 添加错误处理和重试逻辑');

    } catch (error) {
        console.error(`\n❌ API调用失败: ${error.message}`);
        console.log('\n请检查:');
        console.log('1. 服务器是否正在运行');
        console.log('2. 网络连接是否正常');
        console.log('3. API地址是否正确');
    }
}

// 浏览器环境中的HTML示例
if (!isNode && typeof document !== 'undefined') {
    // 创建一个简单的HTML界面
    function createBrowserDemo() {
        const container = document.createElement('div');
        container.innerHTML = `
            <h1>ArcIns ImageToolkit API 演示</h1>
            <button id="runDemo">运行API演示</button>
            <button id="loadGroups">加载图片组</button>
            <div id="output" style="margin-top: 20px; padding: 10px; background: #f5f5f5; white-space: pre-wrap; font-family: monospace;"></div>
        `;
        document.body.appendChild(container);

        const output = document.getElementById('output');
        const originalLog = console.log;
        console.log = function(...args) {
            originalLog.apply(console, args);
            output.textContent += args.join(' ') + '\n';
        };

        document.getElementById('runDemo').onclick = main;
        document.getElementById('loadGroups').onclick = async () => {
            try {
                const api = new ArcInsImageToolkitAPI();
                const groups = await api.getImageGroups();
                console.log('图片组列表:', JSON.stringify(groups, null, 2));
            } catch (error) {
                console.error('加载失败:', error.message);
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBrowserDemo);
    } else {
        createBrowserDemo();
    }
}

// 如果在Node.js环境中直接运行
if (isNode && require.main === module) {
    main().catch(console.error);
}

// 导出API类供其他模块使用
if (isNode) {
    module.exports = ArcInsImageToolkitAPI;
}