using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppMessageTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_modifier_groups_products_product_id",
                table: "modifier_groups");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "modifier_groups",
                newName: "tenant_id");

            migrationBuilder.RenameIndex(
                name: "ix_modifier_groups_product_id",
                table: "modifier_groups",
                newName: "ix_modifier_groups_tenant_id");

            migrationBuilder.AddColumn<string>(
                name: "whats_app_message_template",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_modifier_groups",
                columns: table => new
                {
                    product_id = table.Column<string>(type: "text", nullable: false),
                    modifier_group_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_modifier_groups", x => new { x.product_id, x.modifier_group_id });
                    table.ForeignKey(
                        name: "fk_product_modifier_groups_modifier_groups_modifier_group_id",
                        column: x => x.modifier_group_id,
                        principalTable: "modifier_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_product_modifier_groups_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_product_modifier_groups_modifier_group_id",
                table: "product_modifier_groups",
                column: "modifier_group_id");

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_groups_tenants_tenant_id",
                table: "modifier_groups",
                column: "tenant_id",
                principalTable: "tenants",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_modifier_groups_tenants_tenant_id",
                table: "modifier_groups");

            migrationBuilder.DropTable(
                name: "product_modifier_groups");

            migrationBuilder.DropColumn(
                name: "whats_app_message_template",
                table: "tenants");

            migrationBuilder.RenameColumn(
                name: "tenant_id",
                table: "modifier_groups",
                newName: "product_id");

            migrationBuilder.RenameIndex(
                name: "ix_modifier_groups_tenant_id",
                table: "modifier_groups",
                newName: "ix_modifier_groups_product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_groups_products_product_id",
                table: "modifier_groups",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
