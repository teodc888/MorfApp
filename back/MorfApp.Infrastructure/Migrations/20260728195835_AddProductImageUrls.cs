using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductImageUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_urls",
                table: "products",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            // Migrar la foto única existente al nuevo array, en vez de perderla.
            migrationBuilder.Sql(@"
                UPDATE products
                SET image_urls = jsonb_build_array(image_url)
                WHERE image_url IS NOT NULL AND image_url <> '';
            ");

            migrationBuilder.DropColumn(
                name: "image_url",
                table: "products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "image_urls",
                table: "products");

            migrationBuilder.AddColumn<string>(
                name: "image_url",
                table: "products",
                type: "text",
                nullable: true);
        }
    }
}
