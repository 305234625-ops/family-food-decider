// Supabase初始化
const SUPABASE_URL = 'https://gdhdlxnuopyargiqnwwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaGRseG51b3B5YXJnaXFud3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MzQ2NjUsImV4cCI6MjA3MjExMDY2NX0.0FsiUZypPMuxgn3E9Xi9F06PSEMQV1zqWQmr7YALDLo';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 全局状态
let dishes = [];
let todayMenu = [];
let currentDishId = null;

// DOM加载完成后执行
$(document).ready(function() {
    // 初始化评分星星
    initStarRating();
    
    // 加载菜品数据
    loadDishes();
    
    // 加载今日菜单
    loadTodayMenu();
    
    // 加载热门菜品
    loadPopularDishes();
    
    // 分类筛选事件
    $('#categoryFilter').change(function() {
        filterDishesByCategory($(this).val());
    });
    
    // 保存菜品事件
    $('#save-dish-btn').click(saveDish);
    
    // 随机选择菜品事件
    $('#random-btn').click(randomSelectDish);
    
    // 再次随机选择事件
    $('#random-again-btn').click(randomSelectDish);
    
    // 添加到菜单事件
    $('#add-to-menu-btn').click(addToTodayMenu);
    
    // 编辑菜品事件
    $('#edit-dish-btn').click(function() {
        if (currentDishId) {
            editDish(currentDishId);
        }
    });
    
    // 删除菜品事件
    $('#delete-dish-btn').click(function() {
        if (currentDishId) {
            deleteDish(currentDishId);
        }
    });
    
    // 模态框关闭时重置表单
    $('#dishModal').on('hidden.bs.modal', function() {
        $('#dish-form')[0].reset();
        $('#dish-id').val('');
        setRating(3); // 默认3星
        $('#modalTitle').text('添加菜品');
    });
});

// 初始化评分星星
function initStarRating() {
    $('.rating .star').click(function() {
        const value = parseInt($(this).data('value'));
        setRating(value);
    });
}

// 设置评分
function setRating(value) {
    $('#dish-rating').val(value);
    $('.rating .star').each(function() {
        const starValue = parseInt($(this).data('value'));
        if (starValue <= value) {
            $(this).addClass('active').text('★');
        } else {
            $(this).removeClass('active').text('☆');
        }
    });
}

// 从Supabase加载菜品数据
async function loadDishes() {
    try {
        $('#dishes-list').html('<div class="col-12 text-center"><div class="spinner-border text-success"></div><p>加载中...</p></div>');
        
        const { data, error } = await supabase
            .from('dishes')
            .select('*')
            .order('name');
            
        if (error) throw error;
        
        dishes = data;
        renderDishes(dishes);
    } catch (error) {
        console.error('加载菜品错误:', error);
        $('#dishes-list').html('<div class="col-12"><div class="alert alert-danger">加载菜品失败，请刷新重试</div></div>');
    }
}

// 渲染菜品列表
function renderDishes(dishesToRender) {
    if (dishesToRender.length === 0) {
        $('#dishes-list').html('<div class="col-12"><p class="text-muted">暂无菜品，请点击右上角添加</p></div>');
        return;
    }
    
    let html = '';
    dishesToRender.forEach(dish => {
        const stars = '★'.repeat(dish.rating) + '☆'.repeat(5 - dish.rating);
        
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card dish-card">
                    <span class="badge bg-success category-badge">${dish.category}</span>
                    ${dish.image_url ? `<img src="${dish.image_url}" class="dish-image card-img-top" alt="${dish.name}">` : ''}
                    <div class="card-body">
                        <h5 class="card-title">${dish.name}</h5>
                        <div class="text-warning mb-2">${stars}</div>
                        <button class="btn btn-outline-primary btn-sm view-detail" data-id="${dish.id}">查看详情</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#dishes-list').html(html);
    
    // 绑定查看详情事件
    $('.view-detail').click(function() {
        const dishId = $(this).data('id');
        showDishDetail(dishId);
    });
}

// 按分类筛选菜品
function filterDishesByCategory(category) {
    if (category === 'all') {
        renderDishes(dishes);
    } else {
        const filteredDishes = dishes.filter(dish => dish.category === category);
        renderDishes(filteredDishes);
    }
}

// 显示菜品详情
async function showDishDetail(dishId) {
    try {
        const { data, error } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', dishId)
            .single();
            
        if (error) throw error;
        
        currentDishId = dishId;
        
        // 更新模态框内容
        $('#detail-title').text(data.name);
        $('#detail-image').attr('src', data.image_url || 'https://placehold.co/600x400?text=无图片');
        $('#detail-category').text(data.category);
        $('#detail-rating').html('★'.repeat(data.rating) + '☆'.repeat(5 - data.rating));
        
        // 处理原料列表
        $('#detail-ingredients').empty();
        if (data.ingredients) {
            const ingredientsArray = data.ingredients.split('\n');
            ingredientsArray.forEach(ingredient => {
                if (ingredient.trim()) {
                    $('#detail-ingredients').append(`<li>${ingredient.trim()}</li>`);
                }
            });
        }
        
        // 处理制作步骤
        $('#detail-steps').empty();
        if (data.steps) {
            const stepsArray = data.steps.split('\n');
            stepsArray.forEach(step => {
                if (step.trim()) {
                    $('#detail-steps').append(`<li>${step.trim()}</li>`);
                }
            });
        }
        
        // 显示详情模态框
        $('#detailModal').modal('show');
    } catch (error) {
        console.error('获取菜品详情错误:', error);
        alert('获取菜品详情失败');
    }
}

// 保存菜品（添加或更新）
async function saveDish() {
    const id = $('#dish-id').val();
    const name = $('#dish-name').val();
    const imageUrl = $('#dish-image').val();
    const category = $('#dish-category').val();
    const rating = $('#dish-rating').val();
    const ingredients = $('#dish-ingredients').val();
    const steps = $('#dish-steps').val();
    
    if (!name) {
        alert('请输入菜品名称');
        return;
    }
    
    try {
        // 准备菜品数据
        const dishData = {
            name,
            image_url: imageUrl,
            category,
            rating: parseInt(rating),
            ingredients,
            steps,
            updated_at: new Date().toISOString()
        };
        
        let error;
        
        if (id) {
            // 更新现有菜品
            const { error: updateError } = await supabase
                .from('dishes')
                .update(dishData)
                .eq('id', id);
            error = updateError;
        } else {
            // 添加新菜品
            dishData.created_at = new Date().toISOString();
            const { error: insertError } = await supabase
                .from('dishes')
                .insert([dishData]);
            error = insertError;
        }
        
        if (error) throw error;
        
        // 关闭模态框并重新加载数据
        $('#dishModal').modal('hide');
        loadDishes();
        
    } catch (error) {
        console.error('保存菜品错误:', error);
        alert('保存菜品失败');
    }
}

// 编辑菜品
async function editDish(dishId) {
    try {
        // 关闭详情模态框
        $('#detailModal').modal('hide');
        
        // 获取菜品数据
        const { data, error } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', dishId)
            .single();
            
        if (error) throw error;
        
        // 填充表单
        $('#dish-id').val(data.id);
        $('#dish-name').val(data.name);
        $('#dish-image').val(data.image_url || '');
        $('#dish-category').val(data.category);
        setRating(data.rating);
        $('#dish-ingredients').val(data.ingredients || '');
        $('#dish-steps').val(data.steps || '');
        
        // 更新模态框标题并显示
        $('#modalTitle').text('编辑菜品');
        $('#dishModal').modal('show');
        
    } catch (error) {
        console.error('编辑菜品错误:', error);
        alert('编辑菜品失败');
    }
}

// 删除菜品
async function deleteDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('dishes')
            .delete()
            .eq('id', dishId);
            
        if (error) throw error;
        
        // 关闭模态框并重新加载数据
        $('#detailModal').modal('hide');
        loadDishes();
        
    } catch (error) {
        console.error('删除菜品错误:', error);
        alert('删除菜品失败');
    }
}

// 随机选择菜品:cite[2]:cite[7]
function randomSelectDish() {
    if (dishes.length === 0) {
        alert('请先添加一些菜品');
        return;
    }
    
    // 随机选择一个菜品
    const randomIndex = Math.floor(Math.random() * dishes.length);
    const randomDish = dishes[randomIndex];
    
    // 显示随机结果
    const stars = '★'.repeat(randomDish.rating) + '☆'.repeat(5 - randomDish.rating);
    
    $('#random-dish').html(`
        <div class="card">
            <div class="card-body text-center">
                <h5 class="card-title">${randomDish.name}</h5>
                <p class="text-muted">${randomDish.category}</p>
                <div class="text-warning mb-2">${stars}</div>
            </div>
        </div>
    `);
    
    $('#random-result').show();
    currentDishId = randomDish.id;
}

// 添加到今日菜单
async function addToTodayMenu() {
    if (!currentDishId) return;
    
    try {
        // 获取当前日期（仅日期部分，忽略时间）
        const today = new Date().toISOString().split('T')[0];
        
        // 检查是否已添加到今日菜单
        const { data: existing, error: checkError } = await supabase
            .from('menu_records')
            .select('id')
            .eq('dish_id', currentDishId)
            .gte('added_date', today)
            .lte('added_date', today);
            
        if (checkError) throw checkError;
        
        if (existing && existing.length > 0) {
            alert('该菜品已在今日菜单中');
            return;
        }
        
        // 添加到菜单记录
        const { error } = await supabase
            .from('menu_records')
            .insert([{
                dish_id: currentDishId,
                added_date: today,
                created_at: new Date().toISOString()
            }]);
            
        if (error) throw error;
        
        alert('已添加到今日菜单');
        loadTodayMenu();
        loadPopularDishes();
        
    } catch (error) {
        console.error('添加到菜单错误:', error);
        alert('添加到菜单失败');
    }
}

// 加载今日菜单
async function loadTodayMenu() {
    try {
        // 获取当前日期
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('menu_records')
            .select(`
                id,
                dishes (
                    id, name, category, image_url, rating
                )
            `)
            .gte('added_date', today)
            .lte('added_date', today)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        todayMenu = data.map(record => ({
            menu_id: record.id,
            ...record.dishes
        }));
        
        renderTodayMenu();
    } catch (error) {
        console.error('加载今日菜单错误:', error);
    }
}

// 渲染今日菜单
function renderTodayMenu() {
    if (todayMenu.length === 0) {
        $('#today-menu').html('<p class="text-muted">今日菜单为空，请从上方添加</p>');
        return;
    }
    
    let html = '';
    todayMenu.forEach(dish => {
        const stars = '★'.repeat(dish.rating) + '☆'.repeat(5 - dish.rating);
        
        html += `
            <div class="menu-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${dish.name}</h6>
                    <small class="text-muted">${dish.category} · ${stars}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger remove-from-menu" data-id="${dish.menu_id}">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
    });
    
    $('#today-menu').html(html);
    
    // 绑定移除事件
    $('.remove-from-menu').click(function() {
        const menuId = $(this).data('id');
        removeFromTodayMenu(menuId);
    });
}

// 从今日菜单移除
async function removeFromTodayMenu(menuId) {
    try {
        const { error } = await supabase
            .from('menu_records')
            .delete()
            .eq('id', menuId);
            
        if (error) throw error;
        
        loadTodayMenu();
        
    } catch (error) {
        console.error('移除菜单项错误:', error);
        alert('移除菜单项失败');
    }
}

// 加载热门菜品
async function loadPopularDishes() {
    try {
        const { data, error } = await supabase
            .from('popular_dishes')
            .select(`
                dish_id,
                count,
                dishes (
                    id, name, category, rating
                )
            `)
            .order('count', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        renderPopularDishes(data);
    } catch (error) {
        console.error('加载热门菜品错误:', error);
    }
}

// 渲染热门菜品
function renderPopularDishes(popularDishes) {
    if (!popularDishes || popularDishes.length === 0) {
        $('#popular-dishes').html('<p class="text-muted">暂无数据</p>');
        return;
    }
    
    let html = '<ol class="list-group list-group-numbered">';
    
    popularDishes.forEach(item => {
        const stars = '★'.repeat(item.dishes.rating) + '☆'.repeat(5 - item.dishes.rating);
        
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-start">
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${item.dishes.name}</div>
                    <small class="text-muted">${item.dishes.category} · ${stars}</small>
                </div>
                <span class="badge bg-primary rounded-pill">${item.count}次</span>
            </li>
        `;
    });
    
    html += '</ol>';
    
    $('#popular-dishes').html(html);
}