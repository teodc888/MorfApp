using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionModifierGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "promotion_modifier_groups",
                columns: table => new
                {
                    promotion_id = table.Column<string>(type: "text", nullable: false),
                    modifier_group_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promotion_modifier_groups", x => new { x.promotion_id, x.modifier_group_id });
                    table.ForeignKey(
                        name: "fk_promotion_modifier_groups_modifier_groups_modifier_group_id",
                        column: x => x.modifier_group_id,
                        principalTable: "modifier_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_promotion_modifier_groups_promotions_promotion_id",
                        column: x => x.promotion_id,
                        principalTable: "promotions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_promotion_modifier_groups_modifier_group_id",
                table: "promotion_modifier_groups",
                column: "modifier_group_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "promotion_modifier_groups");
        }
    }
}
