package com.example.boorubrowser

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.CloudDownload
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.FilterList
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.ImageSearch
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.isSystemInDarkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { BooruBrowserApp() }
    }
}

private enum class AppTab(val label: String, val icon: ImageVector) {
    Explore("Explore", Icons.Rounded.Explore),
    Favorites("Saved", Icons.Rounded.Bookmark),
    Downloads("Downloads", Icons.Rounded.CloudDownload),
    Settings("Settings", Icons.Rounded.Settings)
}

private data class PreviewPost(
    val id: Int,
    val title: String,
    val tags: String,
    val tint: List<Color>
)

private val previewPosts = listOf(
    PreviewPost(1, "Soft morning", "original • scenery", listOf(Color(0xFF7565A8), Color(0xFFE5A8B7))),
    PreviewPost(2, "Blue hour", "sky • clouds", listOf(Color(0xFF375B8B), Color(0xFF91B9D9))),
    PreviewPost(3, "Quiet garden", "flowers • nature", listOf(Color(0xFF3D7D69), Color(0xFFB8D4A3))),
    PreviewPost(4, "Warm light", "sunset • original", listOf(Color(0xFFBA684B), Color(0xFFE7C18B))),
    PreviewPost(5, "Dreamscape", "fantasy • landscape", listOf(Color(0xFF61569D), Color(0xFFB7A3D7))),
    PreviewPost(6, "After rain", "city • evening", listOf(Color(0xFF476B72), Color(0xFF9FC6BD))),
    PreviewPost(7, "Petals", "flower • close-up", listOf(Color(0xFFB45F83), Color(0xFFE6B5CB))),
    PreviewPost(8, "Starlight", "night • stars", listOf(Color(0xFF303C6C), Color(0xFF798DC7)))
)

@Composable
private fun BooruBrowserApp() {
    val context = LocalContext.current
    val systemDark = isSystemInDarkTheme()
    val colors = if (android.os.Build.VERSION.SDK_INT >= 31) {
        if (systemDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else {
        if (systemDark) darkColorScheme() else lightColorScheme()
    }

    MaterialTheme(colorScheme = colors) {
        var selectedTab by remember { mutableStateOf(AppTab.Explore) }
        var query by remember { mutableStateOf("") }
        var selectedFilter by remember { mutableStateOf("All") }

        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                NavigationBar(
                    tonalElevation = 0.dp,
                    containerColor = MaterialTheme.colorScheme.surface
                ) {
                    AppTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label, maxLines = 1) }
                        )
                    }
                }
            }
        ) { innerPadding ->
            AnimatedContent(
                targetState = selectedTab,
                transitionSpec = {
                    (fadeIn(tween(180)) + slideInHorizontally(
                        animationSpec = spring(stiffness = 420f),
                        initialOffsetX = { it / 14 }
                    )).togetherWith(
                        fadeOut(tween(100)) + slideOutHorizontally(
                            animationSpec = tween(160),
                            targetOffsetX = { -it / 18 }
                        )
                    )
                },
                label = "main-tab-transition",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) { tab ->
                when (tab) {
                    AppTab.Explore -> ExploreScreen(
                        query = query,
                        onQueryChange = { query = it },
                        selectedFilter = selectedFilter,
                        onFilterChange = { selectedFilter = it }
                    )
                    AppTab.Favorites -> SimpleScreen(
                        title = "Saved posts",
                        subtitle = "Your favorite posts will live here.",
                        icon = Icons.Rounded.Bookmark
                    )
                    AppTab.Downloads -> SimpleScreen(
                        title = "Downloads",
                        subtitle = "Your download history will appear here.",
                        icon = Icons.Rounded.CloudDownload
                    )
                    AppTab.Settings -> SimpleScreen(
                        title = "Settings",
                        subtitle = "Personalize your BooruBrowser experience.",
                        icon = Icons.Rounded.Settings
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExploreScreen(
    query: String,
    onQueryChange: (String) -> Unit,
    selectedFilter: String,
    onFilterChange: (String) -> Unit
) {
    val filters = listOf("All", "General", "Sensitive", "Favorites")
    val shownPosts = previewPosts.filter {
        query.isBlank() || it.title.contains(query, ignoreCase = true) ||
            it.tags.contains(query, ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 16.dp, top = 12.dp, bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "BooruBrowser",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.6).sp
                )
                Text(
                    "Find your next favorite",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            FilledTonalIconButton(onClick = {}) {
                Icon(Icons.Rounded.FilterList, contentDescription = "Filters")
            }
        }

        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            placeholder = { Text("Search tags, artists, characters…") },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    Text(
                        "Clear",
                        modifier = Modifier
                            .clip(CircleShape)
                            .clickable { onQueryChange("") }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(24.dp)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 10.dp, bottom = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Spacer(Modifier.size(8.dp))
            filters.forEach { filter ->
                AssistChip(
                    onClick = { onFilterChange(filter) },
                    label = { Text(filter) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = if (selectedFilter == filter)
                            MaterialTheme.colorScheme.secondaryContainer
                        else MaterialTheme.colorScheme.surface
                    ),
                    border = null
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Discover",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.weight(1f))
            Icon(
                Icons.Rounded.GridView,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
            )
            Text(
                "  ${shownPosts.size} posts",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 2.dp, bottom = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(shownPosts, key = { it.id }) { post ->
                PostCard(post)
            }
        }
    }
}

@Composable
private fun PostCard(post: PreviewPost) {
    var saved by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(spring(stiffness = 500f))
            .clickable { saved = !saved },
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(174.dp)
                    .background(Brush.linearGradient(post.tint)),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Rounded.ImageSearch,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(30.dp)
                    )
                }
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(9.dp),
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.24f)
                ) {
                    Icon(
                        if (saved) Icons.Rounded.Bookmark else Icons.Rounded.Bookmark,
                        contentDescription = if (saved) "Saved preview" else "Save preview",
                        tint = Color.White,
                        modifier = Modifier
                            .clickable { saved = !saved }
                            .padding(7.dp)
                            .size(17.dp)
                    )
                }
            }
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                Text(
                    post.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    post.tags,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun SimpleScreen(title: String, subtitle: String, icon: ImageVector) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(
                top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding(),
                start = 24.dp,
                end = 24.dp
            ),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.secondaryContainer,
            modifier = Modifier.size(88.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.size(38.dp)
                )
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
